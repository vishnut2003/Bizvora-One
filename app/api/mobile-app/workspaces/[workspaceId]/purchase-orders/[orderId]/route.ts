import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, requireObjectId, withMobile } from "@/lib/mobile-api";
import {
  deleteVoucherDoc,
  getVoucherDoc,
  requireVoucherViewer,
  updateVoucherDoc,
} from "../../../../_lib/finance";
import { PURCHASE_ORDER_CONFIG } from "../../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; orderId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, orderId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_ORDER_CONFIG, access);
  requireObjectId(orderId);
  return ok({
    purchaseOrder: await getVoucherDoc(PURCHASE_ORDER_CONFIG, access, orderId),
  });
});

export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, orderId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_ORDER_CONFIG, access);
  requireObjectId(orderId);
  const body = await readJsonBody(req);
  const doc = await updateVoucherDoc(
    PURCHASE_ORDER_CONFIG,
    access,
    orderId,
    body,
  );
  return ok({ purchaseOrder: doc });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, orderId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(PURCHASE_ORDER_CONFIG, access);
  requireObjectId(orderId);
  await deleteVoucherDoc(PURCHASE_ORDER_CONFIG, access, orderId);
  return ok();
});
