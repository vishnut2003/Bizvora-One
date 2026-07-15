import { verifyEmailPassword } from "@/lib/credentials";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  MobileApiError,
  createMobileSession,
  getRequestIp,
  parseDeviceInput,
  signAccessToken,
} from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAILURE_STATUS: Record<string, number> = {
  invalid_credentials: 401,
  wrong_provider: 400,
  account_disabled: 403,
};

export const POST = withMobile(async (req) => {
  const body = await readJsonBody(req);

  const result = await verifyEmailPassword(body.email, body.password);
  if (!result.ok) {
    throw new MobileApiError(FAILURE_STATUS[result.code] ?? 401, result.code);
  }

  const { refreshToken, sessionId } = await createMobileSession(
    result.user.id,
    { device: parseDeviceInput(body.device), ip: getRequestIp(req) },
  );
  const accessToken = await signAccessToken(result.user.id, sessionId);

  return ok({
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: result.user,
  });
});
