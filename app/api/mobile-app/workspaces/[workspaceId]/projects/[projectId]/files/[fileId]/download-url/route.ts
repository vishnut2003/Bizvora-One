import ProjectFile from "@/models/project-file";
import { getSignedDownloadUrl } from "@/lib/storage";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  assertProjectAccess,
  requireProjectViewer,
} from "../../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

  try {
    const url = await getSignedDownloadUrl(
      file.storagePath,
      SIGNED_URL_TTL_SECONDS,
    );
    return ok({
      url,
      kind: "upload",
      expiresAt: new Date(
        Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      ).toISOString(),
    });
  } catch (err) {
    console.error("[mobile files/download-url] signed url failed", err);
    throw new MobileApiError(500, "download_url_failed");
  }
});
