import { requestPasswordResetOtp } from "@/lib/password-reset";
import { MobileApiError } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobile(async (req) => {
  const body = await readJsonBody(req);
  const email = typeof body.email === "string" ? body.email : "";

  const result = await requestPasswordResetOtp(email);
  if (!result.ok) {
    if (result.code === "invalid_email") {
      throw new MobileApiError(422, "validation_failed", {
        email: "Please enter a valid email address.",
      });
    }
    throw new MobileApiError(502, "email_send_failed");
  }

  // Generic success regardless of whether the account exists.
  return ok();
});
