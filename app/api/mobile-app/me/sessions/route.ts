import MobileSession from "@/models/mobile-session";
import { requireMobileUser } from "@/lib/mobile-auth";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobile(async (req) => {
  const { userId, sessionId } = await requireMobileUser(req);

  const docs = await MobileSession.find({
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .lean();

  const items = docs.map((s) => ({
    id: String(s._id),
    device: {
      name: s.device?.name ?? "",
      platform: s.device?.platform ?? "other",
      appVersion: s.device?.appVersion ?? "",
    },
    createdAt: new Date(s.createdAt as Date).toISOString(),
    lastUsedAt: s.lastUsedAt
      ? new Date(s.lastUsedAt as Date).toISOString()
      : null,
    current: String(s._id) === sessionId,
  }));

  return ok({ items });
});
