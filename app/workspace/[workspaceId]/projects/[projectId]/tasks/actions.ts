"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Project from "@/models/project";
import Task from "@/models/task";
import Milestone from "@/models/milestone";
import { getActorRole } from "@/lib/workspace-access";
import { canManageProjects, canViewAllProjects } from "@/lib/project";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task";

export type TaskActionState = {
  ok?: true;
  formError?: string;
  errors?: {
    title?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
    milestone?: string;
  };
};

export type TaskMutationState = { ok: true } | { ok: false; error: string };

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

type WorkspaceDoc = {
  owner: unknown;
  members?: ReadonlyArray<{ user: unknown; role: string }>;
};

type Ctx = {
  ok: true;
  session: AuthedSession;
  role: ReturnType<typeof getActorRole>;
  workspace: WorkspaceDoc;
};

function isStatus(v: string): v is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(v);
}
function isPriority(v: string): v is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(v);
}
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Only managers (owner/admin/project_manager) can mark a task "done". When a
// team member tries, the task goes to "in review" for a manager to approve.
function effectiveStatus(
  role: ReturnType<typeof getActorRole>,
  requested: TaskStatus,
): TaskStatus {
  if (requested === "done" && !canManageProjects(role)) return "in_review";
  return requested;
}

function isWorkspaceMember(workspace: WorkspaceDoc, userId: string): boolean {
  if (String(workspace.owner) === userId) return true;
  return (
    workspace.members?.some((m) => String(m.user) === userId) ?? false
  );
}

// Any project collaborator (manager, or a team member on the project) can work
// with that project's tasks.
async function loadProjectContext(
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

  const project = (await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  })
    .select("team")
    .lean()) as { team?: Array<{ toString(): string }> } | null;
  if (!project) return { ok: false, error: "Project not found." };

  if (!canViewAllProjects(role)) {
    const onTeam = (project.team ?? []).some(
      (t) => String(t) === session.user.id,
    );
    if (!onTeam) {
      return { ok: false, error: "You don't have access to this project." };
    }
  }

  return {
    ok: true,
    session: session as AuthedSession,
    role,
    workspace: workspace as unknown as WorkspaceDoc,
  };
}

type ParsedTask = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: Date | null;
  milestone: string | null;
};

async function parseTaskForm(
  workspaceId: string,
  projectId: string,
  workspace: WorkspaceDoc,
  formData: FormData,
): Promise<
  { data: ParsedTask } | { errors: NonNullable<TaskActionState["errors"]> }
> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "todo");
  const priorityRaw = String(formData.get("priority") ?? "medium");
  const assigneeRaw = String(formData.get("assignee") ?? "").trim();
  const milestoneRaw = String(formData.get("milestone") ?? "").trim();
  const dueDate = parseDate(String(formData.get("dueDate") ?? "") || null);

  const errors: NonNullable<TaskActionState["errors"]> = {};
  if (!title) errors.title = "Title is required.";
  else if (title.length > 200) errors.title = "Title is too long (max 200).";
  if (!isStatus(statusRaw)) errors.status = "Pick a status.";
  if (!isPriority(priorityRaw)) errors.priority = "Pick a priority.";

  let assignee: string | null = null;
  if (assigneeRaw) {
    if (!mongoose.Types.ObjectId.isValid(assigneeRaw)) {
      errors.assignee = "Invalid assignee.";
    } else if (!isWorkspaceMember(workspace, assigneeRaw)) {
      errors.assignee = "Assignee isn't in this workspace.";
    } else {
      assignee = assigneeRaw;
    }
  }

  let milestone: string | null = null;
  if (milestoneRaw) {
    if (!mongoose.Types.ObjectId.isValid(milestoneRaw)) {
      errors.milestone = "Invalid milestone.";
    } else {
      const exists = await Milestone.exists({
        _id: milestoneRaw,
        project: projectId,
        workspace: workspaceId,
      });
      if (!exists) errors.milestone = "Milestone isn't in this project.";
      else milestone = milestoneRaw;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    data: {
      title,
      description: description.slice(0, 4000),
      status: statusRaw as TaskStatus,
      priority: priorityRaw as TaskPriority,
      assignee,
      dueDate,
      milestone,
    },
  };
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!canManageProjects(ctx.role)) {
    return { formError: "Only project managers can add tasks." };
  }

  const parsed = await parseTaskForm(
    workspaceId,
    projectId,
    ctx.workspace,
    formData,
  );
  if ("errors" in parsed) return { errors: parsed.errors };
  const data = parsed.data;

  try {
    await Task.create({
      workspace: workspaceId,
      project: projectId,
      title: data.title,
      description: data.description,
      status: effectiveStatus(ctx.role, data.status),
      priority: data.priority,
      assignee: data.assignee,
      dueDate: data.dueDate,
      milestone: data.milestone,
      createdBy: ctx.session.user.id,
    });
  } catch (err) {
    console.error("[createTask] failed", err);
    return { formError: "Couldn't create the task. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/tasks`);
  return { ok: true };
}

export async function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { formError: ctx.error };
  // Editing task details is a manager action — team members only change status
  // (via setTaskStatus).
  if (!canManageProjects(ctx.role)) {
    return { formError: "Only project managers can edit task details." };
  }

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return { formError: "Invalid task id." };
  }

  const parsed = await parseTaskForm(
    workspaceId,
    projectId,
    ctx.workspace,
    formData,
  );
  if ("errors" in parsed) return { errors: parsed.errors };
  const data = parsed.data;

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  });
  if (!task) return { formError: "Task not found." };

  task.title = data.title;
  task.description = data.description;
  task.status = effectiveStatus(ctx.role, data.status);
  task.priority = data.priority;
  task.assignee = data.assignee
    ? (new mongoose.Types.ObjectId(data.assignee) as typeof task.assignee)
    : null;
  task.dueDate = data.dueDate;
  task.milestone = data.milestone
    ? (new mongoose.Types.ObjectId(data.milestone) as typeof task.milestone)
    : null;

  try {
    await task.save();
  } catch (err) {
    console.error("[updateTask] failed", err);
    return { formError: "Couldn't update the task. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/tasks`);
  return { ok: true };
}

export async function setTaskStatus(
  workspaceId: string,
  projectId: string,
  taskId: string,
  status: string,
): Promise<TaskMutationState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(taskId) || !isStatus(status)) {
    return { ok: false, error: "Invalid request." };
  }

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  })
    .select("assignee")
    .lean();
  if (!task) return { ok: false, error: "Task not found." };

  // Team members can only change the status of their own assigned tasks.
  const assigneeId = (task as { assignee: unknown }).assignee
    ? String((task as { assignee: unknown }).assignee)
    : "";
  if (!canManageProjects(ctx.role) && assigneeId !== ctx.session.user.id) {
    return { ok: false, error: "You can only update your own tasks." };
  }

  await Task.updateOne(
    { _id: taskId, project: projectId, workspace: workspaceId },
    { $set: { status: effectiveStatus(ctx.role, status) } },
  );

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/tasks`);
  return { ok: true };
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskMutationState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManageProjects(ctx.role)) {
    return { ok: false, error: "Only project managers can delete tasks." };
  }

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return { ok: false, error: "Invalid task id." };
  }

  const result = await Task.deleteOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    return { ok: false, error: "Task not found." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/tasks`);
  return { ok: true };
}
