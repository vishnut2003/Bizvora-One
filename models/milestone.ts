import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { MILESTONE_STATUSES } from "@/lib/milestone";

export {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABEL,
  MILESTONE_STATUS_BADGE_CLASS,
  MILESTONE_STATUS_DOT_CLASS,
  type MilestoneStatus,
} from "@/lib/milestone";

const milestoneSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: MILESTONE_STATUSES,
      required: true,
      default: "open",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

milestoneSchema.index({ project: 1, dueDate: 1 });

export type IMilestone = InferSchemaType<typeof milestoneSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Milestone) {
  mongoose.deleteModel("Milestone");
}

const Milestone: Model<IMilestone> =
  (mongoose.models.Milestone as Model<IMilestone> | undefined) ??
  mongoose.model<IMilestone>("Milestone", milestoneSchema);

export default Milestone;
