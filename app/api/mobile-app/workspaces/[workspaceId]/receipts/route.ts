import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";
import { requireVoucherViewer } from "../../../_lib/finance";
import {
  RECEIPT_CONFIG,
  createMoneyVoucher,
  listMoneyVouchers,
} from "../../../_lib/money-vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(RECEIPT_CONFIG, access);
  return ok(await listMoneyVouchers(RECEIPT_CONFIG, access, new URL(req.url)));
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(RECEIPT_CONFIG, access);
  const body = await readJsonBody(req);
  const doc = await createMoneyVoucher(RECEIPT_CONFIG, access, body);
  return ok({ receipt: doc }, 201);
});
