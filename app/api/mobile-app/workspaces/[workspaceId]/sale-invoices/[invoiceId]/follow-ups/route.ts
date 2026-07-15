import mongoose from "mongoose";
import SalesInvoice from "@/models/sales-invoice";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import { requireVoucherViewer } from "../../../../../_lib/finance";
import { SALES_INVOICE_CONFIG } from "../../../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; invoiceId: string }> };

// Records a collections follow-up note on an invoice (mirrors
// recordInvoiceFollowUp, used by the Recovery page).
export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, invoiceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(SALES_INVOICE_CONFIG, access);
  requireObjectId(invoiceId);

  const body = await readJsonBody(req);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  const result = await SalesInvoice.updateOne(
    { _id: invoiceId, workspace: workspaceId },
    {
      $push: {
        followUps: {
          at: new Date(),
          by: new mongoose.Types.ObjectId(access.userId),
          note,
        },
      },
    },
  );
  if (result.matchedCount === 0) {
    throw new MobileApiError(404, "sales_invoice_not_found");
  }

  return ok();
});
