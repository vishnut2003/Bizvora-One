import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { PAYROLL_RUN_STATUSES } from "@/lib/payroll";

// Re-export the pure-data constants so server code can import them here — but
// client components MUST import from "@/lib/payroll" to keep Mongoose out of
// the browser bundle.
export {
  PAYROLL_RUN_STATUSES,
  PAYROLL_RUN_STATUS_LABEL,
  PAYROLL_RUN_STATUS_BADGE_CLASS,
  type PayrollRunStatus,
} from "@/lib/payroll";

const payrollRunSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    // Period-derived, e.g. PR-2026-06. Stored for display / PDF filenames.
    number: { type: String, required: true, trim: true, maxlength: 32 },
    periodMonth: { type: Number, required: true, min: 1, max: 12 },
    periodYear: { type: Number, required: true, min: 2000, max: 2100 },
    status: {
      type: String,
      enum: PAYROLL_RUN_STATUSES,
      required: true,
      default: "draft",
      index: true,
    },
    currency: { type: String, required: true, trim: true, default: "INR" },
    // Denormalized totals, recomputed from payslips on every change.
    employeeCount: { type: Number, required: true, min: 0, default: 0 },
    grossTotal: { type: Number, required: true, min: 0, default: 0 },
    deductionTotal: { type: Number, required: true, min: 0, default: 0 },
    netTotal: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedOn: { type: Date, default: null },
    paidOn: { type: Date, default: null },
  },
  { timestamps: true },
);

// One run per workspace per calendar month.
payrollRunSchema.index(
  { workspace: 1, periodYear: 1, periodMonth: 1 },
  { unique: true },
);
payrollRunSchema.index({ workspace: 1, status: 1 });
payrollRunSchema.index({ workspace: 1, updatedAt: -1 });

export type IPayrollRun = InferSchemaType<typeof payrollRunSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.PayrollRun) {
  mongoose.deleteModel("PayrollRun");
}

const PayrollRun: Model<IPayrollRun> =
  (mongoose.models.PayrollRun as Model<IPayrollRun> | undefined) ??
  mongoose.model<IPayrollRun>("PayrollRun", payrollRunSchema);

export default PayrollRun;
