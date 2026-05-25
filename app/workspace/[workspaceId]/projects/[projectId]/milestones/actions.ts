"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Project from "@/models/project";
import Milestone from "@/models/milestone";
import Task from "@/models/task";
import { getActorRole } from "@/lib/workspace-access";
import { canManageProjects } from "@/lib/project";
import { MILESTONE_STATUSES, type MilestoneStatus } from "@/lib/milestone";

export type MilestoneActionState = {
  ok?: true;
  formError?: string;
  errors?: { title?: string; dueDate?: string; status?: string };
};

export type MilestoneMutationState = { ok: true } | { ok: false; error: string };

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

type Ctx = {
  ok: true;
  session: AuthedSession;
  role: ReturnType<typeof getActorRole>;
};

function isStatus(v: string): v is MilestoneStatus {
  return (MILESTONE_STATUSES as readonly string[]).includes(v);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Verifies the actor can manage this project's milestones (manager roles only).
async function loadManagerContext(
  workspaceId: string,
  projectId: string,
): Promise<Ctx | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(projectId)
  ) {
    return { ok: false, error: "Invalid identifier." };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found." };

  const role = getActorRole(workspace, session.user.id);
  if (!canManageProjects(role)) {
    return { ok: false, error: "Only project managers can manage milestones." };
  }

  // Managers see all projects, so no per-team scoping check is needed.
  const project = await Project.exists({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) return { ok: false, error: "Project not found." };

  return { ok: true, session: session as AuthedSession, role };
}

function parseForm(formData: FormData): {
  data?: {
    title: string;
    description: string;
    dueDate: Date | null;
    status: MilestoneStatus;
  };
  errors?: NonNullable<MilestoneActionState["errors"]>;
} {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "open");
  const dueDate = parseDate(String(formData.get("dueDate") ?? "") || null);

  const errors: NonNullable<MilestoneActionState["errors"]> = {};
  if (!title) errors.title = "Title is required.";
  else if (title.length > 200) errors.title = "Title is too long (max 200).";
  if (!isStatus(statusRaw)) errors.status = "Pick a status.";

  if (Object.keys(errors).length > 0) return { errors };
  return {
    data: {
      title,
      description: description.slice(0, 4000),
      dueDate,
      status: statusRaw as MilestoneStatus,
    },
  };
}

export async function createMilestone(
  workspaceId: string,
  projectId: string,
  _prev: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const ctx = await loadManagerContext(workspaceId, projectId);
  if (!ctx.ok) return { formError: ctx.error };

  const parsed = parseForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  try {
    await Milestone.create({
      workspace: workspaceId,
      project: projectId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: data.status,
      createdBy: ctx.session.user.id,
    });
  } catch (err) {
    console.error("[createMilestone] failed", err);
    return { formError: "Couldn't create the milestone. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/milestones`);
  return { ok: true };
}

export async function updateMilestone(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
  _prev: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const ctx = await loadManagerContext(workspaceId, projectId);
  if (!ctx.ok) return { formError: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(milestoneId)) {
    return { formError: "Invalid milestone id." };
  }

  const parsed = parseForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  const milestone = await Milestone.findOne({
    _id: milestoneId,
    project: projectId,
    workspace: workspaceId,
  });
  if (!milestone) return { formError: "Milestone not found." };

  milestone.title = data.title;
  milestone.description = data.description;
  milestone.dueDate = data.dueDate;
  milestone.status = data.status;

  try {
    await milestone.save();
  } catch (err) {
    console.error("[updateMilestone] failed", err);
    return { formError: "Couldn't update the milestone. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/milestones`);
  return { ok: true };
}

export async function setMilestoneStatus(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
  status: string,
): Promise<MilestoneMutationState> {
  const ctx = await loadManagerContext(workspaceId, projectId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(milestoneId) || !isStatus(status)) {
    return { ok: false, error: "Invalid request." };
  }

  const result = await Milestone.updateOne(
    { _id: milestoneId, project: projectId, workspace: workspaceId },
    { $set: { status } },
  );
  if (result.matchedCount === 0) {
    return { ok: false, error: "Milestone not found." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/milestones`);
  return { ok: true };
}

export async function deleteMilestone(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
): Promise<MilestoneMutationState> {
  const ctx = await loadManagerContext(workspaceId, projectId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(milestoneId)) {
    return { ok: false, error: "Invalid milestone id." };
  }

  const result = await Milestone.deleteOne({
    _id: milestoneId,
    project: projectId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    return { ok: false, error: "Milestone not found." };
  }

  // Detach the milestone from any tasks that referenced it.
  await Task.updateMany(
    { milestone: milestoneId, project: projectId },
    { $set: { milestone: null } },
  );

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/milestones`);
  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/tasks`);
  return { ok: true };
}
