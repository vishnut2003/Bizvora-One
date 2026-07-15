import ProjectFile from "@/models/project-file";
import { requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  listEnvelope,
  ok,
  parsePagination,
  requireObjectId,
  withMobile,
} from "@/lib/mobile-api";
import { assertProjectAccess, requireProjectViewer } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; projectId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);
  await assertProjectAccess(access, projectId);

  const url = new URL(req.url);
  const pagination = parsePagination(url, { defaultLimit: 50 });

  const filter = { workspace: workspaceId, project: projectId };
  const [docs, total] = await Promise.all([
    ProjectFile.find(filter)
      .populate("uploadedBy", "name image")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    ProjectFile.countDocuments(filter),
  ]);

  return ok(listEnvelope(docs, pagination, total));
});
