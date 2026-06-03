import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "@/lib/payroll";

// Re-export the pure-data constants so server code can import them from this
// module when convenient — but client components MUST import from
// "@/lib/payroll" to avoid pulling Mongoose into the browser bundle.
export {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYEE_STATUS_BADGE_CLASS,
  EMPLOYMENT_TYPE_LABEL,
  type EmployeeStatus,
  type EmploymentType,
} from "@/lib/payroll";

const salaryLineSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const salaryStructureSchema = new Schema(
  {
    earnings: { type: [salaryLineSchema], default: [] },
    deductions: { type: [salaryLineSchema], default: [] },
  },
  { _id: false },
);

const employeeSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    empId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 32,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    designation: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      required: true,
      default: "full_time",
    },
    dateOfJoining: { type: Date, default: null },
    status: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
    // Metadata-only association to a workspace user (autofill + dedupe). An
    // employee is NOT a workspace member and gets no portal access.
    linkedUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    salaryStructure: {
      type: salaryStructureSchema,
      default: () => ({ earnings: [], deductions: [] }),
    },
    currency: { type: String, required: true, trim: true, default: "INR" },
    // Stored snapshot of gross (sum of earnings), recomputed in the action on
    // save. Stored rather than virtual so lists and the overview can sort and
    // sum it after .lean().
    monthlyCtc: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "", maxlength: 4000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

employeeSchema.index({ workspace: 1, empId: 1 }, { unique: true });
employeeSchema.index({ workspace: 1, status: 1 });
employeeSchema.index({ workspace: 1, name: 1 });
// One workspace user links to at most one employee per workspace. Partial
// filter excludes null links so any number of employees can stay unlinked.
employeeSchema.index(
  { workspace: 1, linkedUser: 1 },
  {
    unique: true,
    partialFilterExpression: { linkedUser: { $type: "objectId" } },
  },
);

export type IEmployee = InferSchemaType<typeof employeeSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Employee) {
  mongoose.deleteModel("Employee");
}

const Employee: Model<IEmployee> =
  (mongoose.models.Employee as Model<IEmployee> | undefined) ??
  mongoose.model<IEmployee>("Employee", employeeSchema);

export default Employee;
