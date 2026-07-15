import "server-only";
import mongoose from "mongoose";
import Milestone from "@/models/milestone";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task";
import { isWorkspaceMember } from "@/lib/services/lead-service";
import type { MobileWorkspaceContext } from "@/lib/mobile-auth";

export type TaskBodyInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: Date | null;
  milestone: string | null;
};

// Mirrors parseTaskForm from the tasks server actions.
export async function parseTaskBody(
  ctx: MobileWorkspaceContext,
  projectId: string,
  body: Record<string, unknown>,
): Promise<{ data?: TaskBodyInput; errors?: Record<string, string> }> {
  const workspaceId = String(ctx.workspace._id);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const statusRaw = typeof body.status === "string" ? body.status : "todo";
  const priorityRaw =
    typeof body.priority === "string" ? body.priority : "medium";
  const assigneeRaw =
    typeof body.assignee === "string" ? body.assignee.trim() : "";
  const milestoneRaw =
    typeof body.milestone === "string" ? body.milestone.trim() : "";

  let dueDate: Date | null = null;
  if (typeof body.dueDate === "string" && body.dueDate) {
    const d = new Date(body.dueDate);
    dueDate = Number.isNaN(d.getTime()) ? null : d;
  }

  const errors: Record<string, string> = {};
  if (!title) errors.title = "Title is required.";
  else if (title.length > 200) errors.title = "Title is too long (max 200).";
  if (!(TASK_STATUSES as readonly string[]).includes(statusRaw))
    errors.status = "Pick a status.";
  if (!(TASK_PRIORITIES as readonly string[]).includes(priorityRaw))
    errors.priority = "Pick a priority.";

  let assignee: string | null = null;
  if (assigneeRaw) {
    if (!mongoose.Types.ObjectId.isValid(assigneeRaw)) {
      errors.assignee = "Invalid assignee.";
    } else if (!isWorkspaceMember(ctx.workspace, assigneeRaw)) {
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
