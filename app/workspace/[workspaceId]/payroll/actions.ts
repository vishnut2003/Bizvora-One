"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Employee from "@/models/employee";
import PayrollRun from "@/models/payroll-run";
import Payslip from "@/models/payslip";
import { getActorRole } from "@/lib/workspace-access";
import { VOUCHER_CURRENCIES } from "@/lib/voucher";
import {
  canManagePayroll,
  canViewPayroll,
  computeLopAmount,
  computeTotals,
  daysInMonth,
  formatPeriod,
  formatRunNumber,
  lopLineLabel,
  parseSalaryStructure,
  type SalaryLine,
} from "@/lib/payroll";

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

async function loadContext(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      error: "Your session expired. Please sign in again.",
    };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false as const, error: "Invalid workspace." };
  }
  await connectDB();
  const workspaceDoc = await Workspace.findById(workspaceId);
  if (!workspaceDoc) {
    return { ok: false as const, error: "Workspace not found." };
  }
  const role = getActorRole(workspaceDoc, session.user.id);
  if (!canViewPayroll(role)) {
    return {
      ok: false as const,
      error: "You don't have permission to manage payroll.",
    };
  }
  return { ok: true as const, session: session as AuthedSession, role };
}

function isCurrency(v: string): boolean {
  return (VOUCHER_CURRENCIES as readonly string[]).includes(v);
}

function toPlainLines(lines: { label: string; amount: number }[]): SalaryLine[] {
  return lines.map((l) => ({ label: l.label, amount: l.amount }));
}

// Recompute denormalized run totals from the authoritative payslip rows.
// Full recompute (never incremental deltas) so concurrent edits can't drift.
async function recomputeRunTotals(runId: string): Promise<void> {
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

// ── Create run (generation) ──────────────────────────────────────────────────

export type CreateRunState = {
  ok?: true;
  formError?: string;
  errors?: Partial<Record<"period" | "employees" | "currency", string>>;
};

export async function createRun(
  workspaceId: string,
  _prev: CreateRunState,
  formData: FormData,
): Promise<CreateRunState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { formError: "You don't have permission to run payroll." };
  }

  const periodMonth = Number(formData.get("periodMonth"));
  const periodYear = Number(formData.get("periodYear"));
  const currency = ((formData.get("currency") as string | null) ?? "INR").trim();

  if (
    !Number.isInteger(periodMonth) ||
    periodMonth < 1 ||
    periodMonth > 12 ||
    !Number.isInteger(periodYear) ||
    periodYear < 2000 ||
    periodYear > 2100
  ) {
    return { errors: { period: "Pick a valid month and year." } };
  }
  if (!isCurrency(currency)) {
    return { errors: { currency: "Pick a valid currency." } };
  }

  let employeeIds: string[] = [];
  try {
    const parsed = JSON.parse(
      (formData.get("employeeIds") as string | null) ?? "[]",
    ) as unknown;
    if (Array.isArray(parsed)) {
      employeeIds = parsed
        .map((v) => String(v))
        .filter((v) => mongoose.Types.ObjectId.isValid(v));
    }
  } catch {
    employeeIds = [];
  }
  if (employeeIds.length === 0) {
    return { errors: { employees: "Select at least one employee." } };
  }

  // Working-day base for loss-of-pay (run-level). Fall back to calendar days in
  // the period if it's missing or invalid.
  const workingDaysRaw = Number(formData.get("workingDays"));
  const workingDays =
    Number.isFinite(workingDaysRaw) && workingDaysRaw >= 1
      ? Math.floor(workingDaysRaw)
      : daysInMonth(periodMonth, periodYear);

  // Map of employee id → LOP days. Unknown ids are ignored at use; values are
  // coerced to finite >= 0.
  const lopDaysById: Record<string, number> = {};
  try {
    const parsed = JSON.parse(
      (formData.get("lopDaysById") as string | null) ?? "{}",
    ) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
        const days = Number(v);
        if (Number.isFinite(days) && days > 0) lopDaysById[id] = days;
      }
    }
  } catch {
    // Ignore malformed map — treat as no LOP.
  }

  // One run per workspace per month (also enforced by a unique index).
  const existingRun = await PayrollRun.findOne({
    workspace: workspaceId,
    periodYear,
    periodMonth,
  })
    .select("_id")
    .lean();
  if (existingRun) {
    return {
      formError: `A payroll run for ${formatPeriod(periodMonth, periodYear)} already exists.`,
    };
  }

  const employees = await Employee.find({
    _id: { $in: employeeIds },
    workspace: workspaceId,
    status: "active",
  }).lean();

  if (employees.length === 0) {
    return {
      errors: { employees: "None of the selected employees are active." },
    };
  }

  const mismatched = employees.filter((e) => e.currency !== currency);
  if (mismatched.length > 0) {
    return {
      formError: `These employees use a different currency than the run (${currency}): ${mismatched
        .map((e) => e.name)
        .join(", ")}. Set the run currency to match, or update those employees.`,
    };
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
      createdBy: ctx.session.user.id,
    });
    runId = String(run._id);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      return {
        formError: `A payroll run for ${formatPeriod(periodMonth, periodYear)} already exists.`,
      };
    }
    console.error("[createRun] run create failed", err);
    return { formError: "Couldn't create the payroll run. Please try again." };
  }

  const payslipDocs = employees.map((e) => {
    const earnings = toPlainLines(e.salaryStructure?.earnings ?? []);
    const deductions = toPlainLines(e.salaryStructure?.deductions ?? []);
    const base = computeTotals(earnings, deductions);

    // Seed an auto loss-of-pay deduction line from the entered days. It lives in
    // adjustments.deductions so it flows through computeTotals and stays
    // editable/removable on the payslip later (auto, but overridable).
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
    console.error("[createRun] payslip insert failed", err);
    // Continue — recompute reflects whatever inserted; the run is still usable.
  }

  await recomputeRunTotals(runId);

  revalidatePath(`/workspace/${workspaceId}/payroll`);
  redirect(`/workspace/${workspaceId}/payroll/${runId}`);
}

// ── Payslip mutations (draft-only) ───────────────────────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireDraftRun(workspaceId: string, runId: string) {
  if (
    !mongoose.Types.ObjectId.isValid(runId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return { ok: false as const, error: "Invalid identifier." };
  }
  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) return { ok: false as const, error: "Payroll run not found." };
  if (run.status !== "draft") {
    return {
      ok: false as const,
      error: "This run is no longer a draft and can't be changed.",
    };
  }
  return { ok: true as const, run };
}

export async function addEmployeeToRun(
  workspaceId: string,
  runId: string,
  employeeId: string,
): Promise<ActionResult> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { ok: false, error: "You don't have permission to run payroll." };
  }
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { ok: false, error: "Invalid employee id." };
  }

  const draft = await requireDraftRun(workspaceId, runId);
  if (!draft.ok) return draft;
  const run = draft.run;

  const employee = await Employee.findOne({
    _id: employeeId,
    workspace: workspaceId,
    status: "active",
  }).lean();
  if (!employee) {
    return { ok: false, error: "Active employee not found." };
  }
  if (employee.currency !== run.currency) {
    return {
      ok: false,
      error: `${employee.name} uses ${employee.currency}, but this run is in ${run.currency}.`,
    };
  }

  // Adding to an existing draft run intentionally seeds no auto loss-of-pay
  // (LOP days are only collected at run creation). Add it on the payslip editor.
  const earnings = toPlainLines(employee.salaryStructure?.earnings ?? []);
  const deductions = toPlainLines(employee.salaryStructure?.deductions ?? []);
  const totals = computeTotals(earnings, deductions);

  try {
    await Payslip.create({
      workspace: workspaceId,
      run: runId,
      employee: employee._id,
      employeeSnapshot: {
        name: employee.name,
        empId: employee.empId,
        designation: employee.designation ?? "",
        department: employee.department ?? "",
      },
      periodMonth: run.periodMonth,
      periodYear: run.periodYear,
      currency: run.currency,
      earnings,
      deductions,
      adjustments: { earnings: [], deductions: [] },
      gross: totals.gross,
      totalDeductions: totals.totalDeductions,
      net: totals.net,
      status: "draft",
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      return { ok: false, error: "This employee is already in the run." };
    }
    console.error("[addEmployeeToRun] failed", err);
    return { ok: false, error: "Couldn't add the employee. Please try again." };
  }

  await recomputeRunTotals(runId);
  revalidatePath(`/workspace/${workspaceId}/payroll/${runId}`);
  revalidatePath(`/workspace/${workspaceId}/payroll`);
  return { ok: true };
}

export async function removePayslip(
  workspaceId: string,
  runId: string,
  payslipId: string,
): Promise<ActionResult> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { ok: false, error: "You don't have permission to run payroll." };
  }
  if (!mongoose.Types.ObjectId.isValid(payslipId)) {
    return { ok: false, error: "Invalid payslip id." };
  }

  const draft = await requireDraftRun(workspaceId, runId);
  if (!draft.ok) return draft;

  await Payslip.deleteOne({ _id: payslipId, run: runId });
  await recomputeRunTotals(runId);
  revalidatePath(`/workspace/${workspaceId}/payroll/${runId}`);
  revalidatePath(`/workspace/${workspaceId}/payroll`);
  return { ok: true };
}

export type PayslipFormState = {
  ok?: true;
  formError?: string;
};

export async function updatePayslipAdjustments(
  workspaceId: string,
  runId: string,
  payslipId: string,
  _prev: PayslipFormState,
  formData: FormData,
): Promise<PayslipFormState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { formError: "You don't have permission to run payroll." };
  }
  if (!mongoose.Types.ObjectId.isValid(payslipId)) {
    return { formError: "Invalid payslip id." };
  }

  const draft = await requireDraftRun(workspaceId, runId);
  if (!draft.ok) return { formError: draft.error };

  const adjustments = parseSalaryStructure(
    (formData.get("adjustments") as string | null) ?? "",
  );
  if (!adjustments) {
    return { formError: "Adjustments are invalid." };
  }

  const payslip = await Payslip.findOne({ _id: payslipId, run: runId });
  if (!payslip) return { formError: "Payslip not found." };

  const notes = ((formData.get("notes") as string | null) ?? "")
    .trim()
    .slice(0, 2000);

  payslip.adjustments = {
    earnings: adjustments.earnings,
    deductions: adjustments.deductions,
  } as typeof payslip.adjustments;
  payslip.notes = notes;

  const totals = computeTotals(
    [...toPlainLines(payslip.earnings), ...adjustments.earnings],
    [...toPlainLines(payslip.deductions), ...adjustments.deductions],
  );
  payslip.gross = totals.gross;
  payslip.totalDeductions = totals.totalDeductions;
  payslip.net = totals.net;

  try {
    await payslip.save();
  } catch (err) {
    console.error("[updatePayslipAdjustments] failed", err);
    return { formError: "Couldn't save the payslip. Please try again." };
  }

  await recomputeRunTotals(runId);
  revalidatePath(`/workspace/${workspaceId}/payroll/${runId}`);
  revalidatePath(
    `/workspace/${workspaceId}/payroll/${runId}/payslips/${payslipId}/edit`,
  );
  redirect(`/workspace/${workspaceId}/payroll/${runId}`);
}

// ── Run lifecycle ────────────────────────────────────────────────────────────

export async function approveRun(
  workspaceId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { ok: false, error: "You don't have permission to run payroll." };
  }

  const draft = await requireDraftRun(workspaceId, runId);
  if (!draft.ok) return draft;

  const count = await Payslip.countDocuments({
    run: runId,
    status: { $ne: "excluded" },
  });
  if (count < 1) {
    return { ok: false, error: "Add at least one payslip before approving." };
  }

  await PayrollRun.updateOne(
    { _id: runId, workspace: workspaceId },
    {
      $set: {
        status: "approved",
        approvedBy: ctx.session.user.id,
        approvedOn: new Date(),
      },
    },
  );
  await Payslip.updateMany(
    { run: runId, status: "draft" },
    { $set: { status: "finalized" } },
  );

  revalidatePath(`/workspace/${workspaceId}/payroll/${runId}`);
  revalidatePath(`/workspace/${workspaceId}/payroll`);
  return { ok: true };
}

export async function markRunPaid(
  workspaceId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { ok: false, error: "You don't have permission to run payroll." };
  }
  if (
    !mongoose.Types.ObjectId.isValid(runId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return { ok: false, error: "Invalid identifier." };
  }

  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) return { ok: false, error: "Payroll run not found." };
  if (run.status !== "approved") {
    return { ok: false, error: "Only an approved run can be marked paid." };
  }

  await PayrollRun.updateOne(
    { _id: runId },
    { $set: { status: "paid", paidOn: new Date() } },
  );
  await Payslip.updateMany(
    { run: runId, status: "finalized" },
    { $set: { status: "paid" } },
  );

  revalidatePath(`/workspace/${workspaceId}/payroll/${runId}`);
  revalidatePath(`/workspace/${workspaceId}/payroll`);
  return { ok: true };
}

export async function cancelRun(
  workspaceId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { ok: false, error: "You don't have permission to run payroll." };
  }
  if (
    !mongoose.Types.ObjectId.isValid(runId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return { ok: false, error: "Invalid identifier." };
  }

  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) return { ok: false, error: "Payroll run not found." };
  if (run.status === "paid" || run.status === "cancelled") {
    return { ok: false, error: "This run can no longer be cancelled." };
  }

  await PayrollRun.updateOne({ _id: runId }, { $set: { status: "cancelled" } });
  revalidatePath(`/workspace/${workspaceId}/payroll/${runId}`);
  revalidatePath(`/workspace/${workspaceId}/payroll`);
  return { ok: true };
}

export async function deleteRun(
  workspaceId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!canManagePayroll(ctx.role)) {
    return { ok: false, error: "You don't have permission to run payroll." };
  }
  if (
    !mongoose.Types.ObjectId.isValid(runId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return { ok: false, error: "Invalid identifier." };
  }

  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) return { ok: false, error: "Payroll run not found." };
  if (run.status !== "draft" && run.status !== "cancelled") {
    return { ok: false, error: "Only draft or cancelled runs can be deleted." };
  }

  await Payslip.deleteMany({ run: runId });
  await PayrollRun.deleteOne({ _id: runId, workspace: workspaceId });
  revalidatePath(`/workspace/${workspaceId}/payroll`);
  return { ok: true };
}
