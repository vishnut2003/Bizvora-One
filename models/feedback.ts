import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FEEDBACK_MESSAGE_MAX,
} from "@/lib/feedback";

export {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABEL,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  type FeedbackCategory,
  type FeedbackStatus,
  type FeedbackDTO,
} from "@/lib/feedback";

const feedbackSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    // Who submitted the feedback.
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Denormalized so the admin list needs no populate and survives later
    // edits to the user's profile.
    authorName: { type: String, trim: true, default: "" },
    authorEmail: { type: String, trim: true, default: "" },
    category: { type: String, enum: FEEDBACK_CATEGORIES, required: true },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: FEEDBACK_MESSAGE_MAX,
    },
    status: {
      type: String,
      enum: FEEDBACK_STATUSES,
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

// Drives the admin list: filter by status, newest first.
feedbackSchema.index({ status: 1, createdAt: -1 });

export type IFeedback = InferSchemaType<typeof feedbackSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Feedback) {
  mongoose.deleteModel("Feedback");
}

const Feedback: Model<IFeedback> =
  (mongoose.models.Feedback as Model<IFeedback> | undefined) ??
  mongoose.model<IFeedback>("Feedback", feedbackSchema);

export default Feedback;
