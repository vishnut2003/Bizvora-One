import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { BILLING_PERIODS, SUBSCRIPTION_STATUSES } from "@/lib/billing";

const invoiceSchema = new Schema(
  {
    razorpayInvoiceId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "INR" },
    status: { type: String, required: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    issuedAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    hostedInvoiceUrl: { type: String, default: null },
  },
  { _id: false },
);

const subscriptionSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },

    razorpayPlanId: { type: String, required: true },
    // Populated by the webhook on first sub.authenticated/activated event,
    // not at create-time (the customer is provisioned during the auth payment).
    razorpayCustomerId: { type: String, default: "" },
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      required: true,
      default: "created",
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitAmount: { type: Number, required: true },
    period: { type: String, enum: BILLING_PERIODS, required: true },

    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    nextChargeAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    invoices: { type: [invoiceSchema], required: true, default: [] },
    seatSyncDirty: { type: Boolean, default: false },
    lastEventId: { type: String, default: null },

    // Phase 4 — when the owner switches plans, we cancel the current sub at
    // cycle end and create a new one starting after. Until the new sub
    // activates, the upcoming swap is tracked here for UI surfaces.
    pendingPlanSwap: {
      type: new Schema(
        {
          newPlan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
          newPlanName: { type: String, default: "" },
          newRazorpaySubscriptionId: { type: String, default: null },
          scheduledAt: { type: Date, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ status: 1, nextChargeAt: 1 });

export type ISubscription = InferSchemaType<typeof subscriptionSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Subscription) {
  mongoose.deleteModel("Subscription");
}

const Subscription: Model<ISubscription> =
  (mongoose.models.Subscription as Model<ISubscription> | undefined) ??
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;
