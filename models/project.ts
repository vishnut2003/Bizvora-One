import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { PROJECT_STATUSES } from "@/lib/project";

export {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_DOT_CLASS,
  type ProjectStatus,
} from "@/lib/project";

const projectSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    client: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      required: true,
      default: "planning",
      index: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    team: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

projectSchema.index({ workspace: 1, status: 1 });
projectSchema.index({ workspace: 1, team: 1 });
projectSchema.index({ workspace: 1, updatedAt: -1 });

export type IProject = InferSchemaType<typeof projectSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Project) {
  mongoose.deleteModel("Project");
}

const Project: Model<IProject> =
  (mongoose.models.Project as Model<IProject> | undefined) ??
  mongoose.model<IProject>("Project", projectSchema);

export default Project;
