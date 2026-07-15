import Milestone from "@/models/milestone";
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
  requireProjectManager,
  requireProjectViewer,
} from "../../_shared";
import { parseMilestoneBody } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; projectId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);
  await assertProjectAccess(access, projectId);

  const docs = await Milestone.find({
    workspace: workspaceId,
    project: projectId,
  })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  return ok({ items: serialize(docs) });
});

// Milestone management mirrors the web: manager roles only.
export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);
  await assertProjectAccess(access, projectId);

  const body = await readJsonBody(req);
  const parsed = parseMilestoneBody(body);
  if (parsed.errors) {
    throw new MobileApiError(422, "validation_failed", parsed.errors);
  }
  const data = parsed.data!;

  const milestone = await Milestone.create({
    workspace: workspaceId,
    project: projectId,
    title: data.title,
    description: data.description,
    dueDate: data.dueDate,
    status: data.status,
    createdBy: access.userId,
  });

  return ok({ milestone: serialize(milestone.toObject()) }, 201);
});
