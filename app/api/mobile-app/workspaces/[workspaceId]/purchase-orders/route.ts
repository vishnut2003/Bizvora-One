import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, withMobile } from "@/lib/mobile-api";
import {
  createVoucherDoc,
  listVoucherDocs,
  requireVoucherViewer,
} from "../../../_lib/finance";
import { PURCHASE_ORDER_CONFIG } from "../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_ORDER_CONFIG, access);
  return ok(
    await listVoucherDocs(PURCHASE_ORDER_CONFIG, access, new URL(req.url)),
  );
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_ORDER_CONFIG, access);
  const body = await readJsonBody(req);
  const doc = await createVoucherDoc(PURCHASE_ORDER_CONFIG, access, body);
  return ok({ purchaseOrder: doc }, 201);
});
