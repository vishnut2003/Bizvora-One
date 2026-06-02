import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  AUTH_PROVIDERS,
  USER_ROLES,
  type AuthProvider,
} from "@/lib/user";

export {
  AUTH_PROVIDERS,
  USER_ROLES,
  type AuthProvider,
  type UserRole,
} from "@/lib/user";

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
    disabled: { type: Boolean, default: false },
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

if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  mongoose.deleteModel("User");
}

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", userSchema);

export default User;
