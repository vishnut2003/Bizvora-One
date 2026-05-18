import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { LEAD_STAGES, LEAD_SOURCES, LEAD_PRIORITIES } from "@/lib/lead";

export {
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  LEAD_STAGE_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_PRIORITY_LABEL,
  LEAD_STAGE_BADGE_CLASS,
  LEAD_PRIORITY_BADGE_CLASS,
  OPEN_LEAD_STAGES,
  type LeadStage,
  type LeadSource,
  type LeadPriority,
} from "@/lib/lead";

const noteSchema = new Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: true },
);

const stageHistorySchema = new Schema(
  {
    stage: { type: String, enum: LEAD_STAGES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now, required: true },
    note: { type: String, trim: true, maxlength: 280, default: "" },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const leadSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    phone: { type: String, trim: true, default: null },
    company: { type: String, trim: true, default: "" },
    jobTitle: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    address: { type: addressSchema, default: () => ({}) },
    stage: {
      type: String,
      enum: LEAD_STAGES,
      required: true,
      default: "new",
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      required: true,
      default: "other",
    },
    priority: {
      type: String,
      enum: LEAD_PRIORITIES,
      required: true,
      default: "medium",
    },
    estimatedValue: { type: Number, min: 0, default: 0 },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 32 }],
      default: [],
    },
    notes: { type: [noteSchema], default: [] },
    stageHistory: { type: [stageHistorySchema], default: [] },
    nextFollowUpAt: { type: Date, default: null, index: true },
    lastContactedAt: { type: Date, default: null },
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    lostReason: { type: String, trim: true, maxlength: 280, default: "" },
  },
  { timestamps: true },
);

leadSchema.index({ workspace: 1, stage: 1 });
leadSchema.index({ workspace: 1, assignedTo: 1 });
leadSchema.index({ workspace: 1, priority: 1 });
leadSchema.index({ workspace: 1, nextFollowUpAt: 1 });
leadSchema.index({ workspace: 1, tags: 1 });

export type ILead = InferSchemaType<typeof leadSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Lead) {
  mongoose.deleteModel("Lead");
}

const Lead: Model<ILead> =
  (mongoose.models.Lead as Model<ILead> | undefined) ??
  mongoose.model<ILead>("Lead", leadSchema);

export default Lead;
