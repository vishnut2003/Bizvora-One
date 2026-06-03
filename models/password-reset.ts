import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const passwordResetSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // One active reset request per email. The upsert in requestOtp relies on
      // this to atomically replace any prior request.
      unique: true,
    },
    // bcrypt hash of the 6-digit OTP sent to the user.
    otpHash: { type: String, required: true },
    // Number of failed OTP verification attempts, used for rate limiting.
    attempts: { type: Number, default: 0 },
    // Set to true once the OTP has been verified successfully.
    verified: { type: Boolean, default: false },
    // bcrypt hash of the one-time token issued after OTP verification, which
    // authorizes the final password reset step.
    resetTokenHash: { type: String, default: null },
    // When this request expires. A TTL index auto-purges expired documents.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index: MongoDB removes the document once `expiresAt` passes.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IPasswordReset = InferSchemaType<typeof passwordResetSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.PasswordReset) {
  mongoose.deleteModel("PasswordReset");
}

const PasswordReset: Model<IPasswordReset> =
  (mongoose.models.PasswordReset as Model<IPasswordReset> | undefined) ??
  mongoose.model<IPasswordReset>("PasswordReset", passwordResetSchema);

export default PasswordReset;
