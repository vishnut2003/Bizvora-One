import Vendor from "@/models/vendor";
import Payment from "@/models/payment";
import PurchaseInvoice from "@/models/purchase-invoice";
import PurchaseOrder from "@/models/purchase-order";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  parseVendorBody,
  requireVendorManager,
  requireVendorViewer,
  vendorToRawInput,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; vendorId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, vendorId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVendorViewer(access);
  requireObjectId(vendorId);

  const vendor = await Vendor.findOne({
    _id: vendorId,
    workspace: workspaceId,
  }).lean();
  if (!vendor) throw new MobileApiError(404, "vendor_not_found");

  return ok({ vendor: serialize(vendor) });
});

export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, vendorId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVendorManager(access);
  requireObjectId(vendorId);

  const body = await readJsonBody(req);

  const existing = await Vendor.findOne({
    _id: vendorId,
    workspace: workspaceId,
  });
  if (!existing) throw new MobileApiError(404, "vendor_not_found");

  const d = parseVendorBody({ ...vendorToRawInput(existing.toObject()), ...body });

  existing.name = d.name;
  existing.displayName = d.displayName;
  existing.email = d.email || null;
  existing.phone = d.phone || null;
  existing.contactPerson = d.contactPerson;
  existing.address = {
    line1: d.line1,
    line2: d.line2,
    city: d.city,
    state: d.state,
    country: d.country,
    postalCode: d.postalCode,
  } as typeof existing.address;
  existing.gstin = d.gstin;
  existing.pan = d.pan;
  existing.status = d.status;
  existing.notes = d.notes;

  await existing.save();

  return ok({ vendor: serialize(existing.toObject()) });
});

export const DELETE = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, vendorId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVendorManager(access);
  requireObjectId(vendorId);

  const exists = await Vendor.exists({ _id: vendorId, workspace: workspaceId });
  if (!exists) throw new MobileApiError(404, "vendor_not_found");

  // Refuse deletion while purchase documents reference this vendor.
  const filter = { workspace: workspaceId, "vendor.refId": vendorId };
  const [purchaseOrders, purchaseInvoices, payments] = await Promise.all([
    PurchaseOrder.countDocuments(filter),
    PurchaseInvoice.countDocuments(filter),
    Payment.countDocuments(filter),
  ]);
  if (purchaseOrders > 0 || purchaseInvoices > 0 || payments > 0) {
    throw new MobileApiError(409, "vendor_has_linked_documents");
  }

  await Vendor.deleteOne({ _id: vendorId, workspace: workspaceId });
  return ok();
});
