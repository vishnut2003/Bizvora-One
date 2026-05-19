import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  CUSTOMER_ACTIVITY_TYPES,
  CUSTOMER_STATUSES,
} from "@/lib/customer";
import { LEAD_SOURCES } from "@/lib/lead";

export {
  CUSTOMER_ACTIVITY_TYPES,
  CUSTOMER_ACTIVITY_LABEL,
  CUSTOMER_FIELD_LABEL,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABEL,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_DOT_CLASS,
  type CustomerActivityType,
  type CustomerStatus,
} from "@/lib/customer";

export { LEAD_SOURCES, LEAD_SOURCE_LABEL, type LeadSource } from "@/lib/lead";

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
    type: { type: String, enum: CUSTOMER_ACTIVITY_TYPES, required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
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

const billingAddressSchema = new Schema(
  {
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const customerSchema = new Schema(
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
    billingAddress: { type: billingAddressSchema, default: () => ({}) },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 15,
      default: "",
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: "",
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      required: true,
      default: "other",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    convertedFromLead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 32 }],
      default: [],
    },
    notes: { type: [noteSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

customerSchema.index({ workspace: 1, status: 1 });
customerSchema.index({ workspace: 1, assignedTo: 1 });
customerSchema.index({ workspace: 1, tags: 1 });
customerSchema.index({ workspace: 1, convertedFromLead: 1 });

export type ICustomer = InferSchemaType<typeof customerSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Customer) {
  mongoose.deleteModel("Customer");
}

const Customer: Model<ICustomer> =
  (mongoose.models.Customer as Model<ICustomer> | undefined) ??
  mongoose.model<ICustomer>("Customer", customerSchema);

export default Customer;
