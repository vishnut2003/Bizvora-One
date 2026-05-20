"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Project from "@/models/project";
import Customer from "@/models/customer";
import { getActorRole } from "@/lib/workspace-access";
import { canManageProjects } from "@/lib/project";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/project";

export type ProjectActionState = {
  ok?: true;
  formError?: string;
  errors?: Partial<
    Record<
      | "name"
      | "description"
      | "client"
      | "status"
      | "startDate"
      | "endDate"
      | "team",
      string
    >
  >;
};

function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWorkspaceMember(
  workspace: { owner: unknown; members?: ReadonlyArray<{ user: unknown }> },
  userId: string,
): boolean {
  if (String(workspace.owner) === userId) return true;
  return (
    workspace.members?.some((m) => String(m.user) === userId) ?? false
  );
}

export async function createProject(
  workspaceId: string,
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description =
    (formData.get("description") as string | null)?.trim() ?? "";
  const clientRaw = (formData.get("client") as string | null) ?? "";
  const statusRaw = (formData.get("status") as string | null) ?? "planning";
  const startRaw = (formData.get("startDate") as string | null) ?? "";
  const endRaw = (formData.get("endDate") as string | null) ?? "";
  const teamRaw = formData.getAll("team").map((v) => String(v));

  const errors: ProjectActionState["errors"] = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > 160) errors.name = "Name must be 160 chars or fewer.";
  if (description.length > 4000)
    errors.description = "Description is too long (max 4000 chars).";
  if (!isProjectStatus(statusRaw)) errors.status = "Pick a status.";
  if (clientRaw && !mongoose.Types.ObjectId.isValid(clientRaw))
    errors.client = "Invalid client.";
  for (const id of teamRaw) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      errors.team = "Invalid team member id.";
      break;
    }
  }

  const startDate = parseDate(startRaw);
  const endDate = parseDate(endRaw);
  if (startDate && endDate && endDate < startDate) {
    errors.endDate = "End date can't be before start date.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageProjects(actorRole)) {
    return { formError: "You don't have permission to add projects." };
  }

  if (clientRaw) {
    const exists = await Customer.exists({
      _id: clientRaw,
      workspace: workspaceId,
    });
    if (!exists) {
      return { errors: { client: "Client isn't in this workspace." } };
    }
  }

  const uniqueTeam = Array.from(new Set(teamRaw));
  for (const memberId of uniqueTeam) {
    if (!isWorkspaceMember(workspace, memberId)) {
      return {
        errors: { team: "Team members must be in this workspace." },
      };
    }
  }

  let createdProjectId: mongoose.Types.ObjectId | null = null;
  try {
    const created = await Project.create({
      workspace: workspaceId,
      name,
      description,
      client: clientRaw || null,
      status: statusRaw as ProjectStatus,
      startDate,
      endDate,
      team: uniqueTeam,
      createdBy: session.user.id,
    });
    createdProjectId = created._id;
  } catch (err) {
    console.error("[createProject] failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't create the project.";
    return { formError: `${message} Please try again.` };
  }

  // Record the link on the customer's activity timeline so the project shows
  // up in their history. Best-effort — a failure here shouldn't roll back the
  // already-created project.
  if (clientRaw && createdProjectId) {
    try {
      await Customer.updateOne(
        { _id: clientRaw, workspace: workspaceId },
        {
          $push: {
            activity: {
              type: "project_linked",
              actor: new mongoose.Types.ObjectId(session.user.id),
              at: new Date(),
              data: {
                projectId: createdProjectId,
                projectName: name,
                projectStatus: statusRaw,
              },
            },
          },
        },
      );
    } catch (err) {
      console.error("[createProject] failed to log customer activity", err);
    }
  }

  revalidatePath(`/workspace/${workspaceId}/projects`);
  if (clientRaw) revalidatePath(`/workspace/${workspaceId}/customers`);
  return { ok: true };
}
