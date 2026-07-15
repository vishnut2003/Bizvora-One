"use server";

import {
  MAX_OTP_ATTEMPTS,
  requestPasswordResetOtp,
  resetPasswordWithToken,
  verifyPasswordResetOtp,
} from "@/lib/password-reset";

export type RequestOtpState =
  | { ok?: boolean; errors?: { email?: string }; formError?: string }
  | undefined;

export type VerifyOtpState =
  | { ok?: boolean; token?: string; errors?: { code?: string }; formError?: string }
  | undefined;

export type ResetPasswordState =
  | { ok?: boolean; errors?: { password?: string }; formError?: string }
  | undefined;

/**
 * Step 1 — request a reset code. Always returns a generic success message to
 * avoid leaking whether an account exists.
 */
export async function requestOtp(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const email = String(formData.get("email") ?? "");

  const result = await requestPasswordResetOtp(email);
  if (!result.ok) {
    if (result.code === "invalid_email") {
      return { errors: { email: "Please enter a valid email address." } };
    }
    return {
      formError:
        "We couldn't send the reset code right now. Please try again.",
    };
  }

  return { ok: true };
}

/**
 * Step 2 — verify the OTP. On success, issues a one-time reset token (returned
 * to the client) that authorizes the final password reset.
 */
export async function verifyOtp(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");

  const result = await verifyPasswordResetOtp(email, code);
  if (!result.ok) {
    switch (result.code) {
      case "invalid_code_format":
        return { errors: { code: "Enter the 6-digit code from your email." } };
      case "otp_expired":
        return {
          formError: "This code has expired. Please request a new one.",
        };
      case "too_many_attempts":
        return {
          formError: "Too many incorrect attempts. Please request a new code.",
        };
      case "incorrect_code": {
        const remaining = result.attemptsRemaining ?? MAX_OTP_ATTEMPTS;
        return {
          errors: {
            code:
              remaining > 0
                ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
                : "Incorrect code.",
          },
        };
      }
    }
  }

  return { ok: true, token: result.token };
}

/**
 * Step 3 — set the new password using the verified reset token.
 */
export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await resetPasswordWithToken(email, token, password);
  if (!result.ok) {
    switch (result.code) {
      case "weak_password":
        return {
          errors: { password: "Password must be at least 8 characters." },
        };
      case "reset_session_expired":
        return {
          formError: "Your reset session has expired. Please start again.",
        };
      case "reset_session_invalid":
        return {
          formError: "Your reset session is invalid. Please start again.",
        };
    }
  }

  return { ok: true };
}
