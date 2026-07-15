import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import { requireVoucherViewer } from "../../../../_lib/finance";
import {
  PAYMENT_CONFIG,
  getMoneyVoucher,
  updateMoneyVoucher,
} from "../../../../_lib/money-vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; paymentId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, paymentId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PAYMENT_CONFIG, access);
  requireObjectId(paymentId);
  return ok({ payment: await getMoneyVoucher(PAYMENT_CONFIG, access, paymentId) });
});

// No DELETE — payments are reversed by setting status "cancelled".
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, paymentId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PAYMENT_CONFIG, access);
  requireObjectId(paymentId);
  const body = await readJsonBody(req);
  const doc = await updateMoneyVoucher(PAYMENT_CONFIG, access, paymentId, body);
  return ok({ payment: doc });
});
