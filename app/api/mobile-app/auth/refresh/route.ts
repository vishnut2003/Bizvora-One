import { connectDB } from "@/config/db";
import MobileSession from "@/models/mobile-session";
import User from "@/models/user";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  MobileApiError,
  createMobileSession,
  getRequestIp,
  hashRefreshToken,
  signAccessToken,
} from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobile(async (req) => {
  const body = await readJsonBody(req);
  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken : "";
  if (!refreshToken) throw new MobileApiError(400, "invalid_body");

  await connectDB();
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await MobileSession.findOne({ tokenHash });

  if (!session) throw new MobileApiError(401, "invalid_refresh_token");

  // A rotated token being presented again means it leaked (or the client is
  // badly out of sync); revoke every session descended from the same login.
  if (session.replacedByHash) {
    await MobileSession.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw new MobileApiError(401, "refresh_reuse_detected");
  }

  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new MobileApiError(401, "invalid_refresh_token");
  }

  const user = await User.findById(session.user).lean();
  if (!user) throw new MobileApiError(401, "invalid_refresh_token");
  if (user.disabled) throw new MobileApiError(403, "account_disabled");

  const rotated = await createMobileSession(String(session.user), {
    familyId: session.familyId,
    device: {
      name: session.device?.name ?? "",
      platform: session.device?.platform ?? "other",
      appVersion: session.device?.appVersion ?? "",
    },
    ip: getRequestIp(req),
  });

  session.revokedAt = new Date();
  session.replacedByHash = hashRefreshToken(rotated.refreshToken);
  session.lastUsedAt = new Date();
  await session.save();

  const accessToken = await signAccessToken(
    String(session.user),
    rotated.sessionId,
  );

  return ok({
    accessToken,
    refreshToken: rotated.refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
});
