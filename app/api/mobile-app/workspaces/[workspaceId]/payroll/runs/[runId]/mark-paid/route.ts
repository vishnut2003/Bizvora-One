import PayrollRun from "@/models/payroll-run";
import Payslip from "@/models/payslip";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  requirePayrollManager,
  requirePayrollViewer,
} from "../../../../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; runId: string }> };

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, runId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requirePayrollManager(access);
  requireObjectId(runId);

  const run = await PayrollRun.findOne({ _id: runId, workspace: workspaceId });
  if (!run) throw new MobileApiError(404, "payroll_run_not_found");
  if (run.status !== "approved") {
    throw new MobileApiError(409, "run_not_approved");
  }

  await PayrollRun.updateOne(
    { _id: runId },
    { $set: { status: "paid", paidOn: new Date() } },
  );
  await Payslip.updateMany(
    { run: runId, status: "finalized" },
    { $set: { status: "paid" } },
  );

  return ok();
});
