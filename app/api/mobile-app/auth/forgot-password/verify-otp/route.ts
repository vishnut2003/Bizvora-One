import { verifyPasswordResetOtp } from "@/lib/password-reset";
import { MobileApiError } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobile(async (req) => {
  const body = await readJsonBody(req);
  const email = typeof body.email === "string" ? body.email : "";
  const code = typeof body.code === "string" ? body.code : "";

  const result = await verifyPasswordResetOtp(email, code);
  if (!result.ok) {
    if (result.code === "invalid_code_format") {
      throw new MobileApiError(422, "validation_failed", {
        code: "Enter the 6-digit code from your email.",
      });
    }
    if (result.code === "incorrect_code") {
      return Response.json(
        {
          error: "incorrect_code",
          attemptsRemaining: result.attemptsRemaining ?? 0,
        },
        { status: 400 },
      );
    }
    throw new MobileApiError(400, result.code);
  }

  return ok({ resetToken: result.token });
});
