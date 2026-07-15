import MobileSession from "@/models/mobile-session";
import { requireMobileUser } from "@/lib/mobile-auth";
import { ok, requireObjectId, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = withMobile(
  async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await ctx.params;
    const { userId } = await requireMobileUser(req);
    requireObjectId(sessionId);

    await MobileSession.updateOne(
      { _id: sessionId, user: userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    return ok();
  },
);
