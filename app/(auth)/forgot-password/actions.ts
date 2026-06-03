"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/config/db";
import { generateNonce } from "@/lib/integration";
import { sendEmail } from "@/lib/email";
import OtpEmail from "@/emails/otp-email";
import User from "@/models/user";
import PasswordReset from "@/models/password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export type RequestOtpState =
  | { ok?: boolean; errors?: { email?: string }; formError?: string }
  | undefined;

export type VerifyOtpState =
  | { ok?: boolean; token?: string; errors?: { code?: string }; formError?: string }
  | undefined;

export type ResetPasswordState =
  | { ok?: boolean; errors?: { password?: string }; formError?: string }
  | undefined;

function expiryFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateOtp(): string {
  // 6-digit numeric code, zero-padded is unnecessary since the range starts at
  // 100000 (always 6 digits).
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Step 1 — request a reset code. Always returns a generic success message to
 * avoid leaking whether an account exists. Only sends an email when a matching
 * user is found.
 */
export async function requestOtp(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { errors: { email: "Please enter a valid email address." } };
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
      console.error("[forgot-password] failed to send OTP email:", err);
      return {
        formError:
          "We couldn't send the reset code right now. Please try again.",
      };
    }
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
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") ?? "").trim();

  if (!/^\d{6}$/.test(code)) {
    return { errors: { code: "Enter the 6-digit code from your email." } };
  }

  await connectDB();

  const record = await PasswordReset.findOne({ email });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    return {
      formError: "This code has expired. Please request a new one.",
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return {
      formError: "Too many incorrect attempts. Please request a new code.",
    };
  }

  const ok = await bcrypt.compare(code, record.otpHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      errors: {
        code:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Incorrect code.",
      },
    };
  }

  const token = generateNonce(24);
  record.verified = true;
  record.resetTokenHash = await bcrypt.hash(token, 10);
  record.expiresAt = expiryFromNow(OTP_TTL_MINUTES);
  await record.save();

  return { ok: true, token };
}

/**
 * Step 3 — set the new password using the verified reset token. Adds the
 * "credentials" provider for accounts that previously only had Google, so they
 * gain email + password sign-in.
 */
export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { errors: { password: "Password must be at least 8 characters." } };
  }

  await connectDB();

  const record = await PasswordReset.findOne({ email });
  if (
    !record ||
    !record.verified ||
    !record.resetTokenHash ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return {
      formError: "Your reset session has expired. Please start again.",
    };
  }

  const tokenOk = await bcrypt.compare(token, record.resetTokenHash);
  if (!tokenOk) {
    return {
      formError: "Your reset session is invalid. Please start again.",
    };
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
    return { formError: "Your reset session is invalid. Please start again." };
  }

  // One-time use: remove the reset request so it cannot be replayed.
  await PasswordReset.deleteOne({ _id: record._id });

  return { ok: true };
}
