import PayrollRun from "@/models/payroll-run";
import { requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  listEnvelope,
  ok,
  parsePagination,
  readJsonBody,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  createPayrollRun,
  requirePayrollManager,
  requirePayrollViewer,
} from "../../../../_lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);

  const url = new URL(req.url);
  const pagination = parsePagination(url);

  const filter = { workspace: workspaceId };
  const [docs, total] = await Promise.all([
    PayrollRun.find(filter)
      .sort({ periodYear: -1, periodMonth: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    PayrollRun.countDocuments(filter),
  ]);

  return ok(listEnvelope(docs, pagination, total));
});

// Body: { periodMonth, periodYear, currency, employeeIds: string[],
//         workingDays?, lopDaysById?: Record<employeeId, days> }
export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requirePayrollViewer(access);
  requirePayrollManager(access);

  const body = await readJsonBody(req);
  const runId = await createPayrollRun(access, body);

  const run = await PayrollRun.findById(runId).lean();
  return ok({ run: serialize(run) }, 201);
});
