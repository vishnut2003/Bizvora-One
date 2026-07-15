import "server-only";
import mongoose from "mongoose";
import Project from "@/models/project";
import {
  PROJECT_STATUSES,
  canManageProjects,
  canViewAllProjects,
  canViewProjects,
  type ProjectStatus,
} from "@/lib/project";
import { TASK_STATUSES, type TaskStatus } from "@/lib/task";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";

export function requireProjectViewer(ctx: MobileWorkspaceContext): void {
  if (!canViewProjects(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export function requireProjectManager(ctx: MobileWorkspaceContext): void {
  if (!canManageProjects(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

// Only managers (owner/admin/project_manager) can mark a task "done". When a
// team member tries, the task goes to "in review" for a manager to approve.
export function effectiveTaskStatus(
  ctx: MobileWorkspaceContext,
  requested: TaskStatus,
): TaskStatus {
  if (requested === "done" && !canManageProjects(ctx.role)) return "in_review";
  return requested;
}

export type ProjectBodyInput = {
  name: string;
  description: string;
  client: string;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
};

// Mirrors the validation rules of the createProject/updateProject actions.
export function parseProjectBody(body: Record<string, unknown>): {
  data?: ProjectBodyInput;
  errors?: Record<string, string>;
} {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const client = typeof body.client === "string" ? body.client : "";
  const status = typeof body.status === "string" ? body.status : "planning";

  const parseDate = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const startDate = parseDate(body.startDate);
  const endDate = parseDate(body.endDate);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > 160) errors.name = "Name must be 160 chars or fewer.";
  if (description.length > 4000)
    errors.description = "Description is too long (max 4000 chars).";
  if (!(PROJECT_STATUSES as readonly string[]).includes(status))
    errors.status = "Pick a status.";
  if (client && !mongoose.Types.ObjectId.isValid(client))
    errors.client = "Invalid client.";
  if (startDate && endDate && endDate < startDate)
    errors.endDate = "End date can't be before start date.";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      name,
      description,
      client,
      status: status as ProjectStatus,
      startDate,
      endDate,
    },
  };
}

/**
 * Asserts the caller can reach this project: team members can only reach
 * projects whose team includes them (mirrors the web scoping). Returns the
 * project's team ids.
 */
export async function assertProjectAccess(
  ctx: MobileWorkspaceContext,
  projectId: string,
): Promise<void> {
  const project = (await Project.findOne({
    _id: projectId,
    workspace: String(ctx.workspace._id),
  })
    .select("team")
    .lean()) as { team?: Array<{ toString(): string }> } | null;
  if (!project) throw new MobileApiError(404, "project_not_found");

  if (!canViewAllProjects(ctx.role)) {
    const onTeam = (project.team ?? []).some((t) => String(t) === ctx.userId);
    if (!onTeam) throw new MobileApiError(404, "project_not_found");
  }
}
