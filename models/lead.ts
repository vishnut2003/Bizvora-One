import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { INTEGRATION_PROVIDERS } from "@/lib/integration";
import {
  LEAD_ACTIVITY_TYPES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from "@/lib/lead";

export {
  LEAD_ACTIVITY_TYPES,
  LEAD_ACTIVITY_LABEL,
  LEAD_FIELD_LABEL,
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  LEAD_STAGE_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_PRIORITY_LABEL,
  LEAD_STAGE_BADGE_CLASS,
  LEAD_PRIORITY_BADGE_CLASS,
  OPEN_LEAD_STAGES,
  type LeadActivityType,
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

const activitySchema = new Schema(
  {
    type: { type: String, enum: LEAD_ACTIVITY_TYPES, required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const externalSourceSchema = new Schema(
  {
    provider: {
      type: String,
      enum: INTEGRATION_PROVIDERS,
      required: true,
    },
    externalId: { type: String, required: true },
    formId: { type: String, default: null },
    campaignId: { type: String, default: null },
    adId: { type: String, default: null },
    gclid: { type: String, default: null },
    isTest: { type: Boolean, default: false },
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
    activity: { type: [activitySchema], default: [] },
    nextFollowUpAt: { type: Date, default: null, index: true },
    lastContactedAt: { type: Date, default: null },
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    lostReason: { type: String, trim: true, maxlength: 280, default: "" },
    convertedAt: { type: Date, default: null, index: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    externalSource: { type: externalSourceSchema, default: null },
  },
  { timestamps: true },
);

leadSchema.index({ workspace: 1, stage: 1 });
leadSchema.index({ workspace: 1, assignedTo: 1 });
leadSchema.index({ workspace: 1, priority: 1 });
leadSchema.index({ workspace: 1, nextFollowUpAt: 1 });
leadSchema.index({ workspace: 1, tags: 1 });
leadSchema.index({ workspace: 1, convertedAt: 1 });
// Dedupe webhook-imported leads so Google Ads retries are idempotent.
leadSchema.index(
  { workspace: 1, "externalSource.provider": 1, "externalSource.externalId": 1 },
  {
    unique: true,
    partialFilterExpression: { "externalSource.externalId": { $type: "string" } },
  },
);

export type ILead = InferSchemaType<typeof leadSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Lead) {
  mongoose.deleteModel("Lead");
}

const Lead: Model<ILead> =
  (mongoose.models.Lead as Model<ILead> | undefined) ??
  mongoose.model<ILead>("Lead", leadSchema);

export default Lead;
