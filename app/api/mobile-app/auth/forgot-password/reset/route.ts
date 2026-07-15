import { resetPasswordWithToken } from "@/lib/password-reset";
import { MobileApiError } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobile(async (req) => {
  const body = await readJsonBody(req);
  const email = typeof body.email === "string" ? body.email : "";
  const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
  const password = typeof body.password === "string" ? body.password : "";

  const result = await resetPasswordWithToken(email, resetToken, password);
  if (!result.ok) {
    if (result.code === "weak_password") {
      throw new MobileApiError(422, "validation_failed", {
        password: "Password must be at least 8 characters.",
      });
    }
    throw new MobileApiError(400, result.code);
  }

  return ok();
});
