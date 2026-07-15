import PayrollRun from "@/models/payroll-run";
import Payslip from "@/models/payslip";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  requireDraftRun,
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

  await requireDraftRun(workspaceId, runId);

  const count = await Payslip.countDocuments({
    run: runId,
    status: { $ne: "excluded" },
  });
  if (count < 1) {
    throw new MobileApiError(409, "run_has_no_payslips");
  }

  await PayrollRun.updateOne(
    { _id: runId, workspace: workspaceId },
    {
      $set: {
        status: "approved",
        approvedBy: access.userId,
        approvedOn: new Date(),
      },
    },
  );
  await Payslip.updateMany(
    { run: runId, status: "draft" },
    { $set: { status: "finalized" } },
  );

  return ok();
});
