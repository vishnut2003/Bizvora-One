import PayrollRun from "@/models/payroll-run";
import Payslip from "@/models/payslip";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, requireObjectId, serialize, withMobile } from "@/lib/mobile-api";
import {
  requirePayrollManager,
  requirePayrollViewer,
} from "../../../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; runId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requireObjectId(runId);

  const run = await PayrollRun.findOne({
    _id: runId,
    workspace: workspaceId,
  }).lean();
  if (!run) throw new MobileApiError(404, "payroll_run_not_found");

  const payslips = await Payslip.find({ run: runId, workspace: workspaceId })
    .sort({ "employeeSnapshot.name": 1 })
    .lean();

  return ok({ run: serialize(run), payslips: serialize(payslips) });
});

// Only draft or cancelled runs can be deleted (mirrors deleteRun).
export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requirePayrollManager(access);
  requireObjectId(runId);

  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) throw new MobileApiError(404, "payroll_run_not_found");
  if (run.status !== "draft" && run.status !== "cancelled") {
    throw new MobileApiError(409, "run_not_deletable");
  }

  await Payslip.deleteMany({ run: runId });
  await PayrollRun.deleteOne({ _id: runId, workspace: workspaceId });

  return ok();
});
