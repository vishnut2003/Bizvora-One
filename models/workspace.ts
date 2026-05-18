import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { WORKSPACE_COLORS } from "@/lib/workspace";
import { USER_ROLES } from "@/models/user";

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "sales_executive",
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

if (process.env.NODE_ENV !== "production" && mongoose.models.Workspace) {
  mongoose.deleteModel("Workspace");
}

const Workspace: Model<IWorkspace> =
  (mongoose.models.Workspace as Model<IWorkspace> | undefined) ??
  mongoose.model<IWorkspace>("Workspace", workspaceSchema);

export default Workspace;
