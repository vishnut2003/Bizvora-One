import mongoose from "mongoose";
import Task from "@/models/task";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  assertProjectAccess,
  effectiveTaskStatus,
  requireProjectManager,
  requireProjectViewer,
} from "../../../_shared";
import { parseTaskBody } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ workspaceId: string; projectId: string; taskId: string }>;
};

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, taskId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);
  requireObjectId(taskId);
  await assertProjectAccess(access, projectId);

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  })
    .populate("assignee", "name image")
    .populate("milestone", "title status")
    .populate("createdBy", "name image")
    .lean();
  if (!task) throw new MobileApiError(404, "task_not_found");

  return ok({ task: serialize(task) });
});

// Full task edit — manager only (team members change status via /status).
// Provided fields are merged over current values.
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, taskId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);
  requireObjectId(taskId);
  await assertProjectAccess(access, projectId);

  const body = await readJsonBody(req);

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  });
  if (!task) throw new MobileApiError(404, "task_not_found");

  const merged: Record<string, unknown> = {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assignee: task.assignee ? String(task.assignee) : "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : "",
    milestone: task.milestone ? String(task.milestone) : "",
    ...body,
  };
  const parsed = await parseTaskBody(access, projectId, merged);
  if (parsed.errors) {
    throw new MobileApiError(422, "validation_failed", parsed.errors);
  }
  const data = parsed.data!;

  task.title = data.title;
  task.description = data.description;
  task.status = effectiveTaskStatus(access, data.status);
  task.priority = data.priority;
  task.assignee = data.assignee
    ? (new mongoose.Types.ObjectId(data.assignee) as typeof task.assignee)
    : null;
  task.dueDate = data.dueDate;
  task.milestone = data.milestone
    ? (new mongoose.Types.ObjectId(data.milestone) as typeof task.milestone)
    : null;

  await task.save();

  return ok({ task: serialize(task.toObject()) });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, taskId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);
  requireObjectId(taskId);
  await assertProjectAccess(access, projectId);

  const result = await Task.deleteOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    throw new MobileApiError(404, "task_not_found");
  }

  return ok();
});
