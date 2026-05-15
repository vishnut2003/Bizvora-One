import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  WORKSPACE_COLORS,
  WORKSPACE_MEMBER_ROLES,
} from "@/lib/workspace";

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: WORKSPACE_MEMBER_ROLES,
      required: true,
      default: "member",
    },
  },
  { _id: false },
);

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 280, default: "" },
    color: {
      type: String,
      enum: WORKSPACE_COLORS,
      required: true,
      default: "violet",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: { type: [memberSchema], required: true, default: [] },
  },
  { timestamps: true },
);

workspaceSchema.index({ "members.user": 1 });

export type IWorkspace = InferSchemaType<typeof workspaceSchema>;

const Workspace: Model<IWorkspace> =
  (mongoose.models.Workspace as Model<IWorkspace>) ||
  mongoose.model<IWorkspace>("Workspace", workspaceSchema);

export default Workspace;
