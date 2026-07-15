import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";
import { requireVoucherViewer } from "../../../_lib/finance";
import {
  PAYMENT_CONFIG,
  createMoneyVoucher,
  listMoneyVouchers,
} from "../../../_lib/money-vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PAYMENT_CONFIG, access);
  return ok(await listMoneyVouchers(PAYMENT_CONFIG, access, new URL(req.url)));
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PAYMENT_CONFIG, access);
  const body = await readJsonBody(req);
  const doc = await createMoneyVoucher(PAYMENT_CONFIG, access, body);
  return ok({ payment: doc }, 201);
});
