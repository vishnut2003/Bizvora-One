"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import { sendEmail } from "@/lib/email";
import OtpEmail from "@/emails/otp-email";
import User from "@/models/user";
import EmailVerification from "@/models/email-verification";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export type RequestVerificationState =
  | { ok?: boolean; alreadyVerified?: boolean; formError?: string }
  | undefined;

export type VerifyEmailState =
  | { ok?: boolean; errors?: { code?: string }; formError?: string }
  | undefined;

function expiryFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateOtp(): string {
  // 6-digit numeric code; the range starts at 100000 so it's always 6 digits.
  return String(crypto.randomInt(100000, 1000000));
}

// Resolve the signed-in user. Email is always derived from the session — never
// from the form — so a user can only verify their own address.
async function loadSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Your session expired. Please sign in again." };
  }
  await connectDB();
  const user = await User.findById(session.user.id)
    .select("email emailVerified")
    .lean();
  if (!user) {
    return { ok: false as const, error: "Your account could not be found." };
  }
  return { ok: true as const, id: String(user._id), email: user.email, emailVerified: Boolean(user.emailVerified) };
}

/**
 * Step 1 — send a verification code to the signed-in user's email. No-ops with
 * `alreadyVerified` if the address is already verified.
 */
export async function requestEmailVerification(): Promise<RequestVerificationState> {
  const ctx = await loadSessionUser();
  if (!ctx.ok) return { formError: ctx.error };
  if (ctx.emailVerified) return { ok: true, alreadyVerified: true };

  const code = generateOtp();
  const otpHash = await bcrypt.hash(code, 10);

  // Replace any existing request for this email with a fresh one.
  await EmailVerification.findOneAndUpdate(
    { email: ctx.email },
    {
      email: ctx.email,
      otpHash,
      attempts: 0,
      expiresAt: expiryFromNow(OTP_TTL_MINUTES),
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  try {
    await sendEmail({
      to: ctx.email,
      subject: "Your BizvoraOne email verification code",
      react: OtpEmail({
        code,
        expiresInMinutes: OTP_TTL_MINUTES,
        heading: "Verify your email",
        intro:
          "Use the verification code below to confirm your email address and finish setting up your account.",
        previewLabel: "email verification code",
        footnote:
          "Didn't try to verify your email? You can safely ignore this email.",
      }),
    });
  } catch (err) {
    console.error("[verify-email] failed to send OTP email:", err);
    return {
      formError: "We couldn't send the verification code right now. Please try again.",
    };
  }

  return { ok: true };
}

/**
 * Step 2 — verify the OTP. On success, flips the user's `emailVerified` flag and
 * removes the one-time verification record.
 */
export async function verifyEmail(
  _prev: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const ctx = await loadSessionUser();
  if (!ctx.ok) return { formError: ctx.error };
  if (ctx.emailVerified) return { ok: true };

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { errors: { code: "Enter the 6-digit code from your email." } };
  }

  await connectDB();

  const record = await EmailVerification.findOne({ email: ctx.email });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    return { formError: "This code has expired. Please request a new one." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { formError: "Too many incorrect attempts. Please request a new code." };
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

  await User.updateOne({ _id: ctx.id }, { $set: { emailVerified: true } });
  // One-time use: remove the verification request so it cannot be replayed.
  await EmailVerification.deleteOne({ _id: record._id });

  return { ok: true };
}
