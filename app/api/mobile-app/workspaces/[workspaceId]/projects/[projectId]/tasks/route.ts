import type { FilterQuery } from "mongoose";
import Task, { type ITask } from "@/models/task";
import { TASK_STATUSES, type TaskStatus } from "@/lib/task";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  listEnvelope,
  ok,
  parsePagination,
  parseSort,
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
} from "../../_shared";
import { parseTaskBody } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; projectId: string }> };

const SORT_FIELDS = ["createdAt", "updatedAt", "dueDate", "title"] as const;

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);
  await assertProjectAccess(access, projectId);

  const url = new URL(req.url);
  const pagination = parsePagination(url, { defaultLimit: 50 });
  const sort = parseSort(url, SORT_FIELDS, { updatedAt: -1 });

  const filter: FilterQuery<ITask> = {
    workspace: workspaceId,
    project: projectId,
  };

  const status = url.searchParams.get("status") ?? "";
  if ((TASK_STATUSES as readonly string[]).includes(status)) {
    filter.status = status as TaskStatus;
  }

  const assignee = url.searchParams.get("assignee") ?? "";
  if (assignee === "me") filter.assignee = access.userId;
  else if (assignee === "unassigned") filter.assignee = null;
  else if (assignee.length > 0) filter.assignee = assignee;

  const milestone = url.searchParams.get("milestone") ?? "";
  if (milestone.length > 0) filter.milestone = milestone;

  const [docs, total] = await Promise.all([
    Task.find(filter)
      .populate("assignee", "name image")
      .populate("milestone", "title status")
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return ok(listEnvelope(docs, pagination, total));
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);
  await assertProjectAccess(access, projectId);

  const body = await readJsonBody(req);
  const parsed = await parseTaskBody(access, projectId, body);
  if (parsed.errors) {
    throw new MobileApiError(422, "validation_failed", parsed.errors);
  }
  const data = parsed.data!;

  const task = await Task.create({
    workspace: workspaceId,
    project: projectId,
    title: data.title,
    description: data.description,
    status: effectiveTaskStatus(access, data.status),
    priority: data.priority,
    assignee: data.assignee,
    dueDate: data.dueDate,
    milestone: data.milestone,
    createdBy: access.userId,
  });

  return ok({ task: serialize(task.toObject()) }, 201);
});
