import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  deleteQuotationForMobile,
  getQuotation,
  requireQuotationViewer,
  updateQuotationForMobile,
} from "../../../../_lib/quotations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; quotationId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, quotationId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireQuotationViewer(access);
  requireObjectId(quotationId);
  return ok({ quotation: await getQuotation(access, quotationId) });
});

export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, quotationId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireQuotationViewer(access);
  requireObjectId(quotationId);
  const body = await readJsonBody(req);
  const quotation = await updateQuotationForMobile(access, quotationId, body);
  return ok({ quotation });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, quotationId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireQuotationViewer(access);
  requireObjectId(quotationId);
  await deleteQuotationForMobile(access, quotationId);
  return ok();
});
