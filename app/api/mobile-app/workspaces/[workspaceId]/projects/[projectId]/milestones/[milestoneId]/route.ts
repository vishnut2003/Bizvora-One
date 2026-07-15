import Milestone from "@/models/milestone";
import Task from "@/models/task";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import { assertProjectAccess, requireProjectManager } from "../../../_shared";
import { parseMilestoneBody } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{
    workspaceId: string;
    projectId: string;
    milestoneId: string;
  }>;
};

// Partial update: provided fields merged over current values (covers the
// web's updateMilestone and setMilestoneStatus actions).
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, milestoneId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);
  requireObjectId(milestoneId);
  await assertProjectAccess(access, projectId);

  const body = await readJsonBody(req);

  const milestone = await Milestone.findOne({
    _id: milestoneId,
    project: projectId,
    workspace: workspaceId,
  });
  if (!milestone) throw new MobileApiError(404, "milestone_not_found");

  const merged: Record<string, unknown> = {
    title: milestone.title,
    description: milestone.description ?? "",
    status: milestone.status,
    dueDate: milestone.dueDate
      ? new Date(milestone.dueDate).toISOString()
      : "",
    ...body,
  };
  const parsed = parseMilestoneBody(merged);
  if (parsed.errors) {
    throw new MobileApiError(422, "validation_failed", parsed.errors);
  }
  const data = parsed.data!;

  milestone.title = data.title;
  milestone.description = data.description;
  milestone.dueDate = data.dueDate;
  milestone.status = data.status;

  await milestone.save();

  return ok({ milestone: serialize(milestone.toObject()) });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, milestoneId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);
  requireObjectId(milestoneId);
  await assertProjectAccess(access, projectId);

  const result = await Milestone.deleteOne({
    _id: milestoneId,
    project: projectId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    throw new MobileApiError(404, "milestone_not_found");
  }

  // Detach the milestone from any tasks that referenced it.
  await Task.updateMany(
    { milestone: milestoneId, project: projectId },
    { $set: { milestone: null } },
  );

  return ok();
});
