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
  normalizeSalaryStructure,
  recomputeRunTotals,
  requireDraftRun,
  requirePayrollManager,
  requirePayrollViewer,
} from "../../../../../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ workspaceId: string; runId: string; payslipId: string }>;
};

function toPlainLines(
  lines: { label: string; amount: number }[],
): SalaryLine[] {
  return lines.map((l) => ({ label: l.label, amount: l.amount }));
}

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId, payslipId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requireObjectId(runId);
  requireObjectId(payslipId);

  const payslip = await Payslip.findOne({
    _id: payslipId,
    run: runId,
    workspace: workspaceId,
  }).lean();
  if (!payslip) throw new MobileApiError(404, "payslip_not_found");

  return ok({ payslip: serialize(payslip) });
});

// Updates a draft payslip's adjustments + notes (mirrors
// updatePayslipAdjustments). Body: { adjustments: { earnings, deductions }, notes? }
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId, payslipId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requirePayrollManager(access);
  requireObjectId(runId);
  requireObjectId(payslipId);

  await requireDraftRun(workspaceId, runId);

  const body = await readJsonBody(req);
  const adjustments = normalizeSalaryStructure(body.adjustments);
  if (!adjustments) {
    throw new MobileApiError(422, "validation_failed", {
      adjustments: "Adjustments are invalid.",
    });
  }

  const payslip = await Payslip.findOne({
    _id: payslipId,
    run: runId,
    workspace: workspaceId,
  });
  if (!payslip) throw new MobileApiError(404, "payslip_not_found");

  const notes =
    typeof body.notes === "string"
      ? body.notes.trim().slice(0, 2000)
      : (payslip.notes ?? "");

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

  await payslip.save();
  await recomputeRunTotals(runId);

  return ok({ payslip: serialize(payslip.toObject()) });
});

// Removes a payslip from a draft run (mirrors removePayslip).
export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId, payslipId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requirePayrollManager(access);
  requireObjectId(runId);
  requireObjectId(payslipId);

  await requireDraftRun(workspaceId, runId);

  const result = await Payslip.deleteOne({
    _id: payslipId,
    run: runId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    throw new MobileApiError(404, "payslip_not_found");
  }

  await recomputeRunTotals(runId);
  return ok();
});
