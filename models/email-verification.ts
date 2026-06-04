import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Pending email-verification OTP. Kept separate from PasswordReset so a pending
// password reset and a pending email verification for the same address can't
// collide. Mirrors the OTP/TTL shape of password-reset.
const emailVerificationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // One active verification request per email. The upsert in
      // requestEmailVerification relies on this to atomically replace any prior
      // request.
      unique: true,
    },
    // bcrypt hash of the 6-digit OTP sent to the user.
    otpHash: { type: String, required: true },
    // Number of failed OTP verification attempts, used for rate limiting.
    attempts: { type: Number, default: 0 },
    // When this request expires. A TTL index auto-purges expired documents.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index: MongoDB removes the document once `expiresAt` passes.
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IEmailVerification = InferSchemaType<typeof emailVerificationSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.EmailVerification) {
  mongoose.deleteModel("EmailVerification");
}

const EmailVerification: Model<IEmailVerification> =
  (mongoose.models.EmailVerification as
    | Model<IEmailVerification>
    | undefined) ??
  mongoose.model<IEmailVerification>(
    "EmailVerification",
    emailVerificationSchema,
  );

export default EmailVerification;
