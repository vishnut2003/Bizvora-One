import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { getMobileOverview } from "@/lib/services/overview-service";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const { userId, role } = await requireMobileWorkspace(req, workspaceId);

    const overview = await getMobileOverview(workspaceId, role, userId);

    return ok({ role, overview });
  },
);
