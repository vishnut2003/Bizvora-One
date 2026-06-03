import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { PAYSLIP_STATUSES } from "@/lib/payroll";

// Re-export the pure-data constants so server code can import them here — but
// client components MUST import from "@/lib/payroll" to keep Mongoose out of
// the browser bundle.
export {
  PAYSLIP_STATUSES,
  PAYSLIP_STATUS_LABEL,
  PAYSLIP_STATUS_BADGE_CLASS,
  type PayslipStatus,
} from "@/lib/payroll";

// _id: true so individual adjustment rows can be addressed/removed in the UI.
const payslipLineSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: true },
);

// Frozen identity of the employee at the moment the payslip was generated, so
// later edits to the Employee never alter historical payslips.
const employeeSnapshotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    empId: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const adjustmentsSchema = new Schema(
  {
    earnings: { type: [payslipLineSchema], default: [] },
    deductions: { type: [payslipLineSchema], default: [] },
  },
  { _id: false },
);

const payslipSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    run: {
      type: Schema.Types.ObjectId,
      ref: "PayrollRun",
      required: true,
      index: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    employeeSnapshot: { type: employeeSnapshotSchema, required: true },
    periodMonth: { type: Number, required: true, min: 1, max: 12 },
    periodYear: { type: Number, required: true, min: 2000, max: 2100 },
    currency: { type: String, required: true, trim: true, default: "INR" },
    // Snapshot of the employee's base salary structure at generation time.
    earnings: { type: [payslipLineSchema], default: [] },
    deductions: { type: [payslipLineSchema], default: [] },
    // Per-payslip extra lines (e.g. bonus, loss-of-pay as a deduction line).
    adjustments: {
      type: adjustmentsSchema,
      default: () => ({ earnings: [], deductions: [] }),
    },
    // Computed from base + adjustments and stored for list/overview/sorting.
    gross: { type: Number, required: true, min: 0, default: 0 },
    totalDeductions: { type: Number, required: true, min: 0, default: 0 },
    net: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: PAYSLIP_STATUSES,
      required: true,
      default: "draft",
      index: true,
    },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },
  },
  { timestamps: true },
);

// One payslip per employee per run.
payslipSchema.index({ run: 1, employee: 1 }, { unique: true });
// Powers the employee-delete guard (countDocuments by employee).
payslipSchema.index({ workspace: 1, employee: 1 });

export type IPayslip = InferSchemaType<typeof payslipSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Payslip) {
  mongoose.deleteModel("Payslip");
}

const Payslip: Model<IPayslip> =
  (mongoose.models.Payslip as Model<IPayslip> | undefined) ??
  mongoose.model<IPayslip>("Payslip", payslipSchema);

export default Payslip;
