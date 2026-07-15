import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";
import {
  createQuotationForMobile,
  listQuotations,
  requireQuotationViewer,
} from "../../../_lib/quotations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireQuotationViewer(access);
  return ok(await listQuotations(access, new URL(req.url)));
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireQuotationViewer(access);
  const body = await readJsonBody(req);
  const quotation = await createQuotationForMobile(access, body);
  return ok({ quotation }, 201);
});
