import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import { requireVoucherViewer } from "../../../../_lib/finance";
import {
  RECEIPT_CONFIG,
  getMoneyVoucher,
  updateMoneyVoucher,
} from "../../../../_lib/money-vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; receiptId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, receiptId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(RECEIPT_CONFIG, access);
  requireObjectId(receiptId);
  return ok({ receipt: await getMoneyVoucher(RECEIPT_CONFIG, access, receiptId) });
});

// No DELETE — receipts are reversed by setting status "cancelled" (parity
// with the web, where cancellation re-runs the invoice recompute).
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, receiptId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(RECEIPT_CONFIG, access);
  requireObjectId(receiptId);
  const body = await readJsonBody(req);
  const doc = await updateMoneyVoucher(RECEIPT_CONFIG, access, receiptId, body);
  return ok({ receipt: doc });
});
