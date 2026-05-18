import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const USER_ROLES = [
  "owner",
  "admin",
  "sales_manager",
  "sales_executive",
  "accounts",
  "hr",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const AUTH_PROVIDERS = ["credentials", "google"] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

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
    password: {
      type: String,
      select: false,
      required: function (this: { providers?: AuthProvider[] }) {
        return this.providers?.includes("credentials") ?? false;
      },
    },
    image: { type: String, default: null },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "owner",
    },
    emailVerified: { type: Boolean, default: false },
    providers: {
      type: [{ type: String, enum: AUTH_PROVIDERS }],
      required: true,
      default: [],
    },
    googleId: { type: String, default: null, sparse: true, index: true },
  },
  { timestamps: true },
);

export type IUser = InferSchemaType<typeof userSchema>;

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
