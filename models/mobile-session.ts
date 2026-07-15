import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const MOBILE_PLATFORMS = ["ios", "android", "other"] as const;
export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

const mobileSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // sha256 hex of the opaque refresh token. The raw token is never stored.
    tokenHash: { type: String, required: true, unique: true },
    // Stable across rotations of the same login; lets us revoke the whole
    // chain when a rotated (already-replaced) token is presented again.
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
    device: {
      name: { type: String, default: "", trim: true, maxlength: 120 },
      platform: {
        type: String,
        enum: MOBILE_PLATFORMS,
        default: "other",
      },
      appVersion: { type: String, default: "", trim: true, maxlength: 40 },
    },
    ip: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Mongo purges expired sessions automatically.
mobileSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IMobileSession = InferSchemaType<typeof mobileSessionSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.MobileSession) {
  mongoose.deleteModel("MobileSession");
}

const MobileSession: Model<IMobileSession> =
  (mongoose.models.MobileSession as Model<IMobileSession> | undefined) ??
  mongoose.model<IMobileSession>("MobileSession", mobileSessionSchema);

export default MobileSession;
