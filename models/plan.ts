import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { BILLING_PERIODS } from "@/lib/billing";

const planSchema = new Schema(
  {
    razorpayPlanId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 100 },
    currency: { type: String, required: true, default: "INR" },
    period: { type: String, enum: BILLING_PERIODS, required: true },
    interval: { type: Number, required: true, default: 1, min: 1 },

    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: "", maxlength: 280 },
    badge: { type: String, default: "", maxlength: 24 },
    featured: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    archived: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
    trialDays: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type IPlan = InferSchemaType<typeof planSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Plan) {
  mongoose.deleteModel("Plan");
}

const Plan: Model<IPlan> =
  (mongoose.models.Plan as Model<IPlan> | undefined) ??
  mongoose.model<IPlan>("Plan", planSchema);

export default Plan;
