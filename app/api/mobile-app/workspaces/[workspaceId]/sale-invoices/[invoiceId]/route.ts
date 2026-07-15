import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  deleteVoucherDoc,
  getVoucherDoc,
  requireVoucherViewer,
  updateVoucherDoc,
} from "../../../../_lib/finance";
import { SALES_INVOICE_CONFIG } from "../../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; invoiceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, invoiceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(SALES_INVOICE_CONFIG, access);
  requireObjectId(invoiceId);
  return ok({
    invoice: await getVoucherDoc(SALES_INVOICE_CONFIG, access, invoiceId),
  });
});

export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, invoiceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(SALES_INVOICE_CONFIG, access);
  requireObjectId(invoiceId);
  const body = await readJsonBody(req);
  const doc = await updateVoucherDoc(
    SALES_INVOICE_CONFIG,
    access,
    invoiceId,
    body,
  );
  return ok({ invoice: doc });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, invoiceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(SALES_INVOICE_CONFIG, access);
  requireObjectId(invoiceId);
  await deleteVoucherDoc(SALES_INVOICE_CONFIG, access, invoiceId);
  return ok();
});
