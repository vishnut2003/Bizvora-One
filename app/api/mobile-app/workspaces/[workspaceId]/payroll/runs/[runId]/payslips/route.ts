import Employee from "@/models/employee";
import Payslip from "@/models/payslip";
import { computeTotals, type SalaryLine } from "@/lib/payroll";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  recomputeRunTotals,
  requireDraftRun,
  requirePayrollManager,
  requirePayrollViewer,
} from "../../../../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; runId: string }> };

function toPlainLines(
  lines: { label: string; amount: number }[],
): SalaryLine[] {
  return lines.map((l) => ({ label: l.label, amount: l.amount }));
}

// Adds an active employee to a draft run (mirrors addEmployeeToRun). No auto
// loss-of-pay is seeded here — LOP days are only collected at run creation.
export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requirePayrollManager(access);
  requireObjectId(runId);

  const body = await readJsonBody(req);
  const employeeId =
    typeof body.employeeId === "string" ? body.employeeId : "";
  requireObjectId(employeeId);

  const run = await requireDraftRun(workspaceId, runId);

  const employee = await Employee.findOne({
    _id: employeeId,
    workspace: workspaceId,
    status: "active",
  }).lean();
  if (!employee) throw new MobileApiError(404, "employee_not_found");
  if (employee.currency !== run.currency) {
    throw new MobileApiError(409, "currency_mismatch");
  }

  const earnings = toPlainLines(employee.salaryStructure?.earnings ?? []);
  const deductions = toPlainLines(employee.salaryStructure?.deductions ?? []);
  const totals = computeTotals(earnings, deductions);

  try {
    const payslip = await Payslip.create({
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

    await recomputeRunTotals(runId);
    return ok({ payslip: serialize(payslip.toObject()) }, 201);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      throw new MobileApiError(409, "employee_already_in_run");
    }
    throw err;
  }
});
