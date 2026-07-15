import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/config/db";
import { generateNonce } from "@/lib/integration";
import { sendEmail } from "@/lib/email";
import OtpEmail from "@/emails/otp-email";
import User from "@/models/user";
import PasswordReset from "@/models/password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const OTP_TTL_MINUTES = 10;
export const MAX_OTP_ATTEMPTS = 5;

function expiryFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateOtp(): string {
  // 6-digit numeric code; the range starts at 100000 so it is always 6 digits.
  return String(crypto.randomInt(100000, 1000000));
}

export type RequestOtpResult =
  | { ok: true }
  | { ok: false; code: "invalid_email" | "email_send_failed" };

/**
 * Step 1 — request a reset code. Returns ok even when no account matches, so
 * callers can't probe which emails exist. Only sends an email when a matching
 * user is found.
 */
export async function requestPasswordResetOtp(
  emailInput: string,
): Promise<RequestOtpResult> {
  const email = emailInput.trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, code: "invalid_email" };
  }

  await connectDB();

  const user = await User.findOne({ email }).select("_id");

  if (user) {
    const code = generateOtp();
    const otpHash = await bcrypt.hash(code, 10);

    // Replace any existing request for this email with a fresh one.
    await PasswordReset.findOneAndUpdate(
      { email },
      {
        email,
        otpHash,
        attempts: 0,
        verified: false,
        resetTokenHash: null,
        expiresAt: expiryFromNow(OTP_TTL_MINUTES),
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    try {
      await sendEmail({
        to: email,
        subject: "Your BizvoraOne password reset code",
        react: OtpEmail({ code, expiresInMinutes: OTP_TTL_MINUTES }),
      });
    } catch (err) {
      console.error("[password-reset] failed to send OTP email:", err);
      return { ok: false, code: "email_send_failed" };
    }
  }

  return { ok: true };
}

export type VerifyOtpResult =
  | { ok: true; token: string }
  | {
      ok: false;
      code:
        | "invalid_code_format"
        | "otp_expired"
        | "too_many_attempts"
        | "incorrect_code";
      attemptsRemaining?: number;
    };

/**
 * Step 2 — verify the OTP. On success, issues a one-time reset token that
 * authorizes the final password reset.
 */
export async function verifyPasswordResetOtp(
  emailInput: string,
  codeInput: string,
): Promise<VerifyOtpResult> {
  const email = emailInput.trim().toLowerCase();
  const code = codeInput.trim();

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, code: "invalid_code_format" };
  }

  await connectDB();

  const record = await PasswordReset.findOne({ email });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: "otp_expired" };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, code: "too_many_attempts" };
  }

  const match = await bcrypt.compare(code, record.otpHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return {
      ok: false,
      code: "incorrect_code",
      attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - record.attempts),
    };
  }

  const token = generateNonce(24);
  record.verified = true;
  record.resetTokenHash = await bcrypt.hash(token, 10);
  record.expiresAt = expiryFromNow(OTP_TTL_MINUTES);
  await record.save();

  return { ok: true, token };
}

export type ResetPasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "weak_password" | "reset_session_expired" | "reset_session_invalid";
    };

/**
 * Step 3 — set the new password using the verified reset token. Adds the
 * "credentials" provider for accounts that previously only had Google, so they
 * gain email + password sign-in.
 */
export async function resetPasswordWithToken(
  emailInput: string,
  token: string,
  password: string,
): Promise<ResetPasswordResult> {
  const email = emailInput.trim().toLowerCase();

  if (password.length < 8) {
    return { ok: false, code: "weak_password" };
  }

  await connectDB();

  const record = await PasswordReset.findOne({ email });
  if (
    !record ||
    !record.verified ||
    !record.resetTokenHash ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return { ok: false, code: "reset_session_expired" };
  }

  const tokenOk = await bcrypt.compare(token, record.resetTokenHash);
  if (!tokenOk) {
    return { ok: false, code: "reset_session_invalid" };
  }

  // Atomic update avoids loading a partial document and re-running full-document
  // validation on save. $addToSet grants credentials login to Google-only
  // accounts without creating a duplicate provider entry.
  const result = await User.updateOne(
    { email },
    {
      $set: {
        password: await bcrypt.hash(password, 10),
        emailVerified: true,
      },
      $addToSet: { providers: "credentials" },
    },
  );

  if (result.matchedCount === 0) {
    return { ok: false, code: "reset_session_invalid" };
  }

  // One-time use: remove the reset request so it cannot be replayed.
  await PasswordReset.deleteOne({ _id: record._id });

  return { ok: true };
}
