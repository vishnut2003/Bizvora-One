import Task from "@/models/task";
import { canManageProjects } from "@/lib/project";
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
  isTaskStatus,
  requireProjectViewer,
} from "../../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ workspaceId: string; projectId: string; taskId: string }>;
};

// Status-only transition. Team members can move their own assigned tasks;
// "done" from a non-manager lands as "in_review" (mirrors setTaskStatus).
export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, taskId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);
  requireObjectId(taskId);
  await assertProjectAccess(access, projectId);

  const body = await readJsonBody(req);
  const status = typeof body.status === "string" ? body.status : "";
  if (!isTaskStatus(status)) {
    throw new MobileApiError(422, "validation_failed", {
      status: "Pick a status.",
    });
  }

  const task = await Task.findOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  });
  if (!task) throw new MobileApiError(404, "task_not_found");

  // Team members can only change the status of their own assigned tasks.
  const assigneeId = task.assignee ? String(task.assignee) : "";
  if (!canManageProjects(access.role) && assigneeId !== access.userId) {
    throw new MobileApiError(403, "forbidden");
  }

  task.status = effectiveTaskStatus(access, status);
  await task.save();

  return ok({ task: serialize(task.toObject()) });
});
