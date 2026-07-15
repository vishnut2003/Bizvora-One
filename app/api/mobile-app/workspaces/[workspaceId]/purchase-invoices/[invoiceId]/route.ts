import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  getVoucherDoc,
  requireVoucherViewer,
  updateVoucherDoc,
} from "../../../../_lib/finance";
import { PURCHASE_INVOICE_CONFIG } from "../../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; invoiceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, invoiceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_INVOICE_CONFIG, access);
  requireObjectId(invoiceId);
  return ok({
    invoice: await getVoucherDoc(PURCHASE_INVOICE_CONFIG, access, invoiceId),
  });
});

// No DELETE — the web offers no purchase-invoice deletion; cancellation
// happens via status "cancelled" on update.
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, invoiceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_INVOICE_CONFIG, access);
  requireObjectId(invoiceId);
  const body = await readJsonBody(req);
  const doc = await updateVoucherDoc(
    PURCHASE_INVOICE_CONFIG,
    access,
    invoiceId,
    body,
  );
  return ok({ invoice: doc });
});
