import MobileSession from "@/models/mobile-session";
import { hashRefreshToken, requireMobileUser } from "@/lib/mobile-auth";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobile(async (req) => {
  const { userId, sessionId } = await requireMobileUser(req);

  // Body is optional: default is revoking the session the access token
  // belongs to. { all: true } signs out every device; { refreshToken } lets
  // the client revoke the exact session it holds.
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // no body — fall through to sid-based revocation
  }

  const now = new Date();

  if (body?.all === true) {
    await MobileSession.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: now } },
    );
  } else if (typeof body?.refreshToken === "string" && body.refreshToken) {
    await MobileSession.updateOne(
      { user: userId, tokenHash: hashRefreshToken(body.refreshToken) },
      { $set: { revokedAt: now } },
    );
  } else {
    await MobileSession.updateOne(
      { _id: sessionId, user: userId },
      { $set: { revokedAt: now } },
    );
  }

  return ok();
});
