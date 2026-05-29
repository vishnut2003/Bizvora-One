"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Vendor from "@/models/vendor";
import PurchaseInvoice from "@/models/purchase-invoice";
import PurchaseOrder from "@/models/purchase-order";
import { getActorRole } from "@/lib/workspace-access";
import {
  PURCHASE_INVOICE_STATUSES,
  canManagePurchases,
  canViewPurchases,
  computeTotals,
  escapeRegex,
  formatVoucherNumber,
  lineSubtotal,
  parseDate,
  parseVoucherItems,
  type PurchaseInvoiceStatus,
} from "@/lib/voucher";

export type PurchaseInvoiceActionState = {
  ok?: true;
  formError?: string;
  errors?: Partial<
    Record<
      | "party"
      | "items"
      | "status"
      | "currency"
      | "primaryDate"
      | "secondaryDate"
      | "discount"
      | "notes",
      string
    >
  >;
};

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

async function loadContext(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false as const, error: "Invalid workspace." };
  }
  await connectDB();
  const workspaceDoc = await Workspace.findById(workspaceId);
  if (!workspaceDoc) return { ok: false as const, error: "Workspace not found." };
  const role = getActorRole(workspaceDoc, session.user.id);
  if (!canViewPurchases(role)) {
    return { ok: false as const, error: "You don't have permission to manage purchase invoices." };
  }
  return { ok: true as const, session: session as AuthedSession, role };
}

function isStatus(v: string): v is PurchaseInvoiceStatus {
  return (PURCHASE_INVOICE_STATUSES as readonly string[]).includes(v);
}

async function nextNumber(workspaceId: string, year: number): Promise<string> {
  const prefix = `PI-${year}-`;
  const last = (await PurchaseInvoice.findOne({
    workspace: workspaceId,
    number: new RegExp(`^${escapeRegex(prefix)}`),
  })
    .sort({ number: -1 })
    .select({ number: 1 })
    .lean()
    .exec()) as { number?: string } | null;
  let seq = 1;
  if (last?.number) {
    const match = last.number.match(/(\d+)$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  return formatVoucherNumber("PI", year, seq);
}

type ParsedForm = {
  vendorId: string;
  vendorName: string;
  vendorCompany: string;
  vendorEmail: string;
  vendorGstin: string;
  vendorBillNumber: string;
  status: PurchaseInvoiceStatus;
  currency: string;
  invoiceDate: Date;
  dueDate: Date | null;
  discount: number;
  notes: string;
  items: ReturnType<typeof parseVoucherItems>;
};

function parseForm(
  formData: FormData,
): { ok: true; data: ParsedForm } | { ok: false; errors: NonNullable<PurchaseInvoiceActionState["errors"]> } {
  const errors: NonNullable<PurchaseInvoiceActionState["errors"]> = {};

  const vendorId = (formData.get("partyId") as string | null)?.trim() ?? "";
  const vendorName = (formData.get("partyName") as string | null)?.trim() ?? "";
  if (!vendorId || !vendorName || !mongoose.Types.ObjectId.isValid(vendorId)) {
    errors.party = "Pick a vendor.";
  }

  const statusRaw = (formData.get("status") as string | null) ?? "unpaid";
  if (!isStatus(statusRaw)) errors.status = "Pick a status.";

  const currency = ((formData.get("currency") as string | null) ?? "INR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.currency = "Currency must be a 3-letter code.";

  const invoiceDate = parseDate(formData.get("primaryDate") as string | null);
  if (!invoiceDate) errors.primaryDate = "Invoice date is required.";
  const dueDate = parseDate(formData.get("secondaryDate") as string | null);
  if (invoiceDate && dueDate && dueDate < invoiceDate) {
    errors.secondaryDate = "Due date can't be before the invoice date.";
  }

  const discountRaw = Number((formData.get("discount") as string | null) ?? "0");
  const discount = Number.isFinite(discountRaw) && discountRaw >= 0 ? discountRaw : 0;

  const notes = ((formData.get("notes") as string | null) ?? "").trim();
  if (notes.length > 4000) errors.notes = "Notes are too long.";

  const itemsRaw = (formData.get("items") as string | null) ?? "[]";
  const items = parseVoucherItems(itemsRaw);
  if (!items || items.length === 0) errors.items = "Add at least one line item.";
  else if (items.some((it) => !it.description)) errors.items = "Every line item needs a description.";
  else if (items.length > 100) errors.items = "Too many line items (max 100).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      vendorId,
      vendorName,
      vendorCompany: (formData.get("partyCompany") as string | null)?.trim() ?? "",
      vendorEmail: (formData.get("partyEmail") as string | null)?.trim() ?? "",
      vendorGstin: ((formData.get("partyGstin") as string | null) ?? "").trim().toUpperCase(),
      vendorBillNumber: ((formData.get("vendorBillNumber") as string | null) ?? "").trim().slice(0, 64),
      status: statusRaw as PurchaseInvoiceStatus,
      currency,
      invoiceDate: invoiceDate as Date,
      dueDate,
      discount,
      notes,
      items,
    },
  };
}

async function verifyVendor(workspaceId: string, vendorId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) return false;
  return Boolean(await Vendor.exists({ _id: vendorId, workspace: workspaceId }));
}

function vendorSnapshot(d: ParsedForm) {
  return {
    refId: new mongoose.Types.ObjectId(d.vendorId),
    name: d.vendorName,
    company: d.vendorCompany,
    email: d.vendorEmail,
    gstin: d.vendorGstin,
  };
}

function reconcileStatus(
  pickedStatus: PurchaseInvoiceStatus,
  total: number,
  amountPaid: number,
  dueDate: Date | null,
): PurchaseInvoiceStatus {
  if (pickedStatus === "cancelled") return "cancelled";
  if (amountPaid >= total && total > 0) return "paid";
  if (amountPaid > 0) return "partial";
  if (dueDate && dueDate < new Date()) return "overdue";
  return "unpaid";
}

export async function createPurchaseInvoice(
  workspaceId: string,
  _prev: PurchaseInvoiceActionState,
  formData: FormData,
): Promise<PurchaseInvoiceActionState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!canManagePurchases(ctx.role)) {
    return { formError: "You don't have permission to create purchase invoices." };
  }

  const parsed = parseForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  const valid = await verifyVendor(workspaceId, d.vendorId);
  if (!valid) {
    return { errors: { party: "That vendor is no longer in this workspace." } };
  }

  const persistedItems = (d.items ?? []).map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(d.items ?? [], d.discount);
  const finalStatus = reconcileStatus(d.status, totals.total, 0, d.dueDate);

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextNumber(workspaceId, d.invoiceDate.getFullYear());
    try {
      await PurchaseInvoice.create({
        workspace: workspaceId,
        number,
        vendorBillNumber: d.vendorBillNumber,
        vendor: vendorSnapshot(d),
        currency: d.currency,
        invoiceDate: d.invoiceDate,
        dueDate: d.dueDate,
        items: persistedItems,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discount: d.discount,
        total: totals.total,
        amountPaid: 0,
        status: finalStatus,
        notes: d.notes,
        createdBy: ctx.session.user.id,
      });
      revalidatePath(`/workspace/${workspaceId}/purchase-invoices`);
      redirect(`/workspace/${workspaceId}/purchase-invoices`);
    } catch (err) {
      const e = err as { code?: number; digest?: string };
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
      if (e?.code === 11000) continue;
      console.error("[createPurchaseInvoice] failed", err);
      return { formError: "Couldn't create the purchase invoice. Please try again." };
    }
  }
  return { formError: "Couldn't allocate an invoice number. Please try again." };
}

export async function updatePurchaseInvoice(
  workspaceId: string,
  invoiceId: string,
  _prev: PurchaseInvoiceActionState,
  formData: FormData,
): Promise<PurchaseInvoiceActionState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!canManagePurchases(ctx.role)) {
    return { formError: "You can't edit purchase invoices." };
  }
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return { formError: "Invalid invoice id." };
  }

  const existing = await PurchaseInvoice.findOne({
    _id: invoiceId,
    workspace: workspaceId,
  });
  if (!existing) return { formError: "Purchase invoice not found." };

  const parsed = parseForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  const valid = await verifyVendor(workspaceId, d.vendorId);
  if (!valid) {
    return { errors: { party: "That vendor is no longer in this workspace." } };
  }

  const persistedItems = (d.items ?? []).map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(d.items ?? [], d.discount);
  const finalStatus = reconcileStatus(
    d.status,
    totals.total,
    existing.amountPaid ?? 0,
    d.dueDate,
  );

  existing.vendor = vendorSnapshot(d) as unknown as typeof existing.vendor;
  existing.vendorBillNumber = d.vendorBillNumber;
  existing.currency = d.currency;
  existing.invoiceDate = d.invoiceDate;
  existing.dueDate = d.dueDate;
  existing.items = persistedItems as unknown as typeof existing.items;
  existing.subtotal = totals.subtotal;
  existing.taxTotal = totals.taxTotal;
  existing.discount = d.discount;
  existing.total = totals.total;
  existing.status = finalStatus;
  existing.notes = d.notes;

  try {
    await existing.save();
  } catch (err) {
    console.error("[updatePurchaseInvoice] failed", err);
    return { formError: "Couldn't save the invoice. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/purchase-invoices`);
  revalidatePath(`/workspace/${workspaceId}/purchase-invoices/${invoiceId}/edit`);
  redirect(`/workspace/${workspaceId}/purchase-invoices`);
}

// Raise a fresh purchase invoice (vendor bill record) from an existing
// purchase order. Copies vendor + items + discount + notes verbatim,
// generates a brand-new PI number, links the invoice back to the source
// order via `purchaseOrder`, and flips the order's status to "invoiced".
// Mirrors the sales-side convertSalesOrderToInvoice flow.
export async function convertPurchaseOrderToInvoice(
  workspaceId: string,
  orderId: string,
): Promise<{ ok: false; error: string } | void> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return { ok: false, error: "Invalid purchase order id." };
  }

  const order = await PurchaseOrder.findOne({
    _id: orderId,
    workspace: workspaceId,
  });
  if (!order) return { ok: false, error: "Purchase order not found." };

  if (order.status === "invoiced" || order.status === "cancelled") {
    return {
      ok: false,
      error: "This order can't be converted in its current state.",
    };
  }
  if (!order.items || order.items.length === 0) {
    return { ok: false, error: "Order has no items to invoice." };
  }

  // Caller must be able to create purchase invoices. The purchase side is
  // gated tighter than sales — sales_executive has no business raising
  // vendor bills — so we use canManagePurchases rather than the per-record
  // ownership check used on sales orders.
  if (!canManagePurchases(ctx.role)) {
    return {
      ok: false,
      error: "You don't have permission to convert this order.",
    };
  }

  const invoiceItems = order.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    taxRate: it.taxRate,
    lineTotal: lineSubtotal({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
    }),
  }));
  const totals = computeTotals(
    order.items.map((it) => ({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
    })),
    order.discount ?? 0,
  );
  const invoiceDate = new Date();
  const status = reconcileStatus("unpaid", totals.total, 0, null);

  const assignedTo = order.assignedTo
    ? new mongoose.Types.ObjectId(String(order.assignedTo))
    : null;

  let createdId: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextNumber(workspaceId, invoiceDate.getFullYear());
    try {
      const created = await PurchaseInvoice.create({
        workspace: workspaceId,
        number,
        // Vendor's own bill number is left blank — the buyer fills it in
        // once they actually receive the vendor's printed invoice.
        vendorBillNumber: "",
        vendor: {
          refId: order.vendor.refId ?? null,
          name: order.vendor.name,
          company: order.vendor.company ?? "",
          email: order.vendor.email ?? "",
          gstin: order.vendor.gstin ?? "",
        },
        purchaseOrder: order._id,
        currency: order.currency,
        invoiceDate,
        dueDate: null,
        items: invoiceItems,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discount: order.discount ?? 0,
        total: totals.total,
        amountPaid: 0,
        status,
        notes: order.notes ?? "",
        createdBy: new mongoose.Types.ObjectId(ctx.session.user.id),
        assignedTo,
      });
      createdId = String(created._id);
      break;
    } catch (err) {
      const e = err as { code?: number; digest?: string };
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
      if (e?.code === 11000) continue;
      console.error("[convertPurchaseOrderToInvoice] create failed", err);
      return {
        ok: false,
        error: "Couldn't create the purchase invoice. Please try again.",
      };
    }
  }

  if (!createdId) {
    return {
      ok: false,
      error: "Couldn't allocate an invoice number. Please try again.",
    };
  }

  // Flip the source order to "invoiced". A failure here is non-fatal — the
  // invoice already exists; the user can hand-edit the order status.
  try {
    await PurchaseOrder.updateOne(
      { _id: order._id, workspace: workspaceId },
      { $set: { status: "invoiced" } },
    );
  } catch (err) {
    console.error(
      "[convertPurchaseOrderToInvoice] order status update failed",
      err,
    );
  }

  revalidatePath(`/workspace/${workspaceId}/purchase-orders`);
  revalidatePath(`/workspace/${workspaceId}/purchase-orders/${orderId}/edit`);
  revalidatePath(`/workspace/${workspaceId}/purchase-invoices`);
  // The query param drives a one-time success popup on the destination page.
  redirect(
    `/workspace/${workspaceId}/purchase-invoices/${createdId}/edit?fromOrder=${encodeURIComponent(
      order.number,
    )}`,
  );
}
