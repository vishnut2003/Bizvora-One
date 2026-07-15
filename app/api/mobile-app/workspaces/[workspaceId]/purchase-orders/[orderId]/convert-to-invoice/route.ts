import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  convertOrderToInvoice,
  requireVoucherViewer,
} from "../../../../../_lib/finance";
import {
  PURCHASE_INVOICE_CONFIG,
  PURCHASE_ORDER_CONFIG,
} from "../../../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; orderId: string }> };

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, orderId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_ORDER_CONFIG, access);
  requireObjectId(orderId);

  const invoice = await convertOrderToInvoice(
    PURCHASE_ORDER_CONFIG,
    PURCHASE_INVOICE_CONFIG,
    access,
    orderId,
    "purchaseOrder",
  );

  return ok({ invoice }, 201);
});
