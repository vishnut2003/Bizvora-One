import ProjectFile from "@/models/project-file";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  assertProjectAccess,
  requireProjectViewer,
} from "../../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ workspaceId: string; projectId: string; fileId: string }>;
};

// Returns a download URL as JSON instead of redirecting (mobile clients
// follow it themselves). Mirrors the permission logic of the web download
// route, including the external-link branch.
export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId, fileId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);
  requireObjectId(fileId);
  await assertProjectAccess(access, projectId);

  const file = await ProjectFile.findOne({
    _id: fileId,
    project: projectId,
    workspace: workspaceId,
  }).lean();
  if (!file) throw new MobileApiError(404, "file_not_found");

  if (file.kind === "link") {
    if (!file.url) throw new MobileApiError(404, "file_not_found");
    return ok({ url: file.url, kind: "link", expiresAt: null });
  }

  if (!file.storagePath) throw new MobileApiError(404, "file_not_found");

  // storagePath holds the full public Blob URL, which never expires.
  return ok({ url: file.storagePath, kind: "upload", expiresAt: null });
});
