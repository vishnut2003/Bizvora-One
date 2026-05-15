import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const USER_ROLES = [
  "owner",
  "admin",
  "sales_manager",
  "sales_executive",
  "accounts",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "owner",
    },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type IUser = InferSchemaType<typeof userSchema>;

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
