import "server-only";
import mongoose from "mongoose";
import Employee from "@/models/employee";
import PayrollRun from "@/models/payroll-run";
import Payslip from "@/models/payslip";
import { canManageEmployees } from "@/lib/user";
import { VOUCHER_CURRENCIES, parseDate } from "@/lib/voucher";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  canManagePayroll,
  canViewPayroll,
  computeLopAmount,
  computeTotals,
  daysInMonth,
  formatRunNumber,
  lopLineLabel,
  parseSalaryStructure,
  type EmployeeStatus,
  type EmploymentType,
  type SalaryLine,
  type SalaryStructure,
} from "@/lib/payroll";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmployeeManager(ctx: MobileWorkspaceContext): void {
  if (!canManageEmployees(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export function requirePayrollViewer(ctx: MobileWorkspaceContext): void {
  if (!canViewPayroll(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export function requirePayrollManager(ctx: MobileWorkspaceContext): void {
  if (!canManagePayroll(ctx.role)) throw new MobileApiError(403, "forbidden");
}

// parseSalaryStructure expects a JSON string (web form convention); mobile
// bodies send the object directly.
export function normalizeSalaryStructure(
  input: unknown,
): SalaryStructure | null {
  if (typeof input === "string") return parseSalaryStructure(input);
  if (input === undefined || input === null) return parseSalaryStructure("");
  try {
    return parseSalaryStructure(JSON.stringify(input));
  } catch {
    return null;
  }
}

export type EmployeeBodyInput = {
  empId: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: EmploymentType;
  dateOfJoining: Date | null;
  status: EmployeeStatus;
  currency: string;
  linkedUser: string | null;
  salaryStructure: SalaryStructure;
  notes: string;
};

// Mirrors parseForm from employees/actions.ts.
export function parseEmployeeBody(
  body: Record<string, unknown>,
): EmployeeBodyInput {
  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";

  const errors: Record<string, string> = {};

  const empId = str("empId").toUpperCase();
  if (!empId) errors.empId = "Employee ID is required.";
  else if (empId.length > 32) errors.empId = "Employee ID is too long (max 32).";

  const name = str("name");
  if (!name) errors.name = "Name is required.";
  else if (name.length > 160) errors.name = "Name is too long (max 160).";

  const email = str("email").toLowerCase();
  if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email.";

  const phone = str("phone");
  if (phone.length > 40) errors.phone = "Phone is too long.";

  const status = str("status") || "active";
  if (!(EMPLOYEE_STATUSES as readonly string[]).includes(status))
    errors.status = "Pick a status.";

  const currency = str("currency") || "INR";
  if (!(VOUCHER_CURRENCIES as readonly string[]).includes(currency))
    errors.currency = "Pick a valid currency.";

  const employmentTypeRaw = str("employmentType") || "full_time";
  const employmentType = (EMPLOYMENT_TYPES as readonly string[]).includes(
    employmentTypeRaw,
  )
    ? (employmentTypeRaw as EmploymentType)
    : "full_time";

  const structure = normalizeSalaryStructure(body.salaryStructure);
  if (!structure) errors.salaryStructure = "Salary structure is invalid.";

  const linkedUserRaw = str("linkedUser");
  const linkedUser =
    linkedUserRaw && mongoose.Types.ObjectId.isValid(linkedUserRaw)
      ? linkedUserRaw
      : null;

  if (Object.keys(errors).length > 0 || !structure) {
    throw new MobileApiError(422, "validation_failed", errors);
  }

  return {
    empId,
    name,
    email,
    phone,
    designation: str("designation"),
    department: str("department"),
    employmentType,
    dateOfJoining: parseDate(str("dateOfJoining") || null),
    status: status as EmployeeStatus,
    currency,
    linkedUser,
    salaryStructure: structure,
    notes: str("notes").slice(0, 4000),
  };
}

// Raw-record view of an employee doc for partial-update merging.
export function employeeToRawInput(employee: {
  empId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  employmentType: string;
  dateOfJoining?: Date | null;
  status: string;
  currency: string;
  linkedUser?: unknown;
  salaryStructure?: unknown;
  notes?: string | null;
}): Record<string, unknown> {
  const structure = (employee.salaryStructure ?? {
    earnings: [],
    deductions: [],
  }) as { earnings?: SalaryLine[]; deductions?: SalaryLine[] };
  return {
    empId: employee.empId,
    name: employee.name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    employmentType: employee.employmentType,
    dateOfJoining: employee.dateOfJoining
      ? new Date(employee.dateOfJoining).toISOString()
      : "",
    status: employee.status,
    currency: employee.currency,
    linkedUser: employee.linkedUser ? String(employee.linkedUser) : "",
    salaryStructure: {
      earnings: (structure.earnings ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
      deductions: (structure.deductions ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
    },
    notes: employee.notes ?? "",
  };
}

function toPlainLines(lines: { label: string; amount: number }[]): SalaryLine[] {
  return lines.map((l) => ({ label: l.label, amount: l.amount }));
}

// Recompute denormalized run totals from the authoritative payslip rows.
// Full recompute (never incremental deltas) so concurrent edits can't drift.
export async function recomputeRunTotals(runId: string): Promise<void> {
  const slips = await Payslip.find({
    run: runId,
    status: { $ne: "excluded" },
  })
    .select("gross totalDeductions net")
    .lean();

  let grossTotal = 0;
  let deductionTotal = 0;
  let netTotal = 0;
  for (const s of slips) {
    grossTotal += s.gross ?? 0;
    deductionTotal += s.totalDeductions ?? 0;
    netTotal += s.net ?? 0;
  }

  await PayrollRun.updateOne(
    { _id: runId },
    {
      $set: {
        employeeCount: slips.length,
        grossTotal: Math.round(grossTotal * 100) / 100,
        deductionTotal: Math.round(deductionTotal * 100) / 100,
        netTotal: Math.round(netTotal * 100) / 100,
      },
    },
  );
}

export async function requireDraftRun(workspaceId: string, runId: string) {
  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) throw new MobileApiError(404, "payroll_run_not_found");
  if (run.status !== "draft") {
    throw new MobileApiError(409, "run_not_draft");
  }
  return run;
}

/**
 * Generate a payroll run with payslips seeded from each employee's salary
 * structure + optional loss-of-pay days. Mirrors createRun in
 * payroll/actions.ts (incl. one-run-per-month and currency-match rules).
 */
export async function createPayrollRun(
  ctx: MobileWorkspaceContext,
  body: Record<string, unknown>,
): Promise<string> {
  const workspaceId = String(ctx.workspace._id);

  const periodMonth = Number(body.periodMonth);
  const periodYear = Number(body.periodYear);
  const currency =
    typeof body.currency === "string" ? body.currency.trim() : "INR";

  if (
    !Number.isInteger(periodMonth) ||
    periodMonth < 1 ||
    periodMonth > 12 ||
    !Number.isInteger(periodYear) ||
    periodYear < 2000 ||
    periodYear > 2100
  ) {
    throw new MobileApiError(422, "validation_failed", {
      period: "Pick a valid month and year.",
    });
  }
  if (!(VOUCHER_CURRENCIES as readonly string[]).includes(currency)) {
    throw new MobileApiError(422, "validation_failed", {
      currency: "Pick a valid currency.",
    });
  }

  const employeeIds = Array.isArray(body.employeeIds)
    ? body.employeeIds
        .map((v) => String(v))
        .filter((v) => mongoose.Types.ObjectId.isValid(v))
    : [];
  if (employeeIds.length === 0) {
    throw new MobileApiError(422, "validation_failed", {
      employees: "Select at least one employee.",
    });
  }

  const workingDaysRaw = Number(body.workingDays);
  const workingDays =
    Number.isFinite(workingDaysRaw) && workingDaysRaw >= 1
      ? Math.floor(workingDaysRaw)
      : daysInMonth(periodMonth, periodYear);

  const lopDaysById: Record<string, number> = {};
  if (body.lopDaysById && typeof body.lopDaysById === "object") {
    for (const [id, v] of Object.entries(
      body.lopDaysById as Record<string, unknown>,
    )) {
      const days = Number(v);
      if (Number.isFinite(days) && days > 0) lopDaysById[id] = days;
    }
  }

  // One run per workspace per month (also enforced by a unique index).
  const existingRun = await PayrollRun.findOne({
    workspace: workspaceId,
    periodYear,
    periodMonth,
  })
    .select("_id")
    .lean();
  if (existingRun) throw new MobileApiError(409, "run_already_exists");

  const employees = await Employee.find({
    _id: { $in: employeeIds },
    workspace: workspaceId,
    status: "active",
  }).lean();
  if (employees.length === 0) {
    throw new MobileApiError(422, "validation_failed", {
      employees: "None of the selected employees are active.",
    });
  }

  const mismatched = employees.filter((e) => e.currency !== currency);
  if (mismatched.length > 0) {
    throw new MobileApiError(422, "validation_failed", {
      currency: `These employees use a different currency than the run (${currency}): ${mismatched
        .map((e) => e.name)
        .join(", ")}.`,
    });
  }

  const number = formatRunNumber(periodYear, periodMonth);

  let runId: string;
  try {
    const run = await PayrollRun.create({
      workspace: workspaceId,
      number,
      periodMonth,
      periodYear,
      status: "draft",
      currency,
      employeeCount: 0,
      grossTotal: 0,
      deductionTotal: 0,
      netTotal: 0,
      createdBy: ctx.userId,
    });
    runId = String(run._id);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      throw new MobileApiError(409, "run_already_exists");
    }
    throw err;
  }

  const payslipDocs = employees.map((e) => {
    const earnings = toPlainLines(e.salaryStructure?.earnings ?? []);
    const deductions = toPlainLines(e.salaryStructure?.deductions ?? []);
    const base = computeTotals(earnings, deductions);

    // Seed an auto loss-of-pay deduction line from the entered days — it
    // stays editable/removable on the payslip later.
    const lopDays = lopDaysById[String(e._id)] ?? 0;
    const lopAmount = computeLopAmount(base.gross, workingDays, lopDays);
    const lopLines: SalaryLine[] =
      lopAmount > 0 ? [{ label: lopLineLabel(lopDays), amount: lopAmount }] : [];

    const totals = computeTotals(earnings, [...deductions, ...lopLines]);
    return {
      workspace: workspaceId,
      run: runId,
      employee: e._id,
      employeeSnapshot: {
        name: e.name,
        empId: e.empId,
        designation: e.designation ?? "",
        department: e.department ?? "",
      },
      periodMonth,
      periodYear,
      currency,
      workingDays,
      lopDays,
      earnings,
      deductions,
      adjustments: { earnings: [], deductions: lopLines },
      gross: totals.gross,
      totalDeductions: totals.totalDeductions,
      net: totals.net,
      status: "draft" as const,
    };
  });

  try {
    await Payslip.insertMany(payslipDocs, { ordered: false });
  } catch (err) {
    console.error("[mobile payroll] payslip insert failed", err);
    // Continue — recompute reflects whatever inserted; the run is usable.
  }

  await recomputeRunTotals(runId);
  return runId;
}
