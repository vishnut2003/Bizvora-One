"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Customer from "@/models/customer";
import SalesInvoice from "@/models/sales-invoice";
import SalesOrder from "@/models/sales-order";
import { getActorRole } from "@/lib/workspace-access";
import {
  SALES_INVOICE_STATUSES,
  canManageAnyVoucher,
  canManageVoucher,
  canViewVouchers,
  computeTotals,
  escapeRegex,
  formatVoucherNumber,
  lineSubtotal,
  parseDate,
  parseVoucherItems,
  type SalesInvoiceStatus,
} from "@/lib/voucher";

export type SalesInvoiceActionState = {
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
    return {
      ok: false as const,
      error: "Your session expired. Please sign in again.",
    };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false as const, error: "Invalid workspace." };
  }
  await connectDB();
  const workspaceDoc = await Workspace.findById(workspaceId);
  if (!workspaceDoc) return { ok: false as const, error: "Workspace not found." };
  const role = getActorRole(workspaceDoc, session.user.id);
  if (!canViewVouchers(role)) {
    return {
      ok: false as const,
      error: "You don't have permission to manage sales invoices.",
    };
  }
  return {
    ok: true as const,
    session: session as AuthedSession,
    role,
  };
}

function isStatus(v: string): v is SalesInvoiceStatus {
  return (SALES_INVOICE_STATUSES as readonly string[]).includes(v);
}

async function nextInvoiceNumber(
  workspaceId: string,
  year: number,
): Promise<string> {
  const prefix = `SI-${year}-`;
  const last = (await SalesInvoice.findOne({
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
  return formatVoucherNumber("SI", year, seq);
}

type ParsedForm = {
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerGstin: string;
  status: SalesInvoiceStatus;
  currency: string;
  invoiceDate: Date;
  dueDate: Date | null;
  discount: number;
  notes: string;
  items: ReturnType<typeof parseVoucherItems>;
};

function parseForm(
  formData: FormData,
): { ok: true; data: ParsedForm } | { ok: false; errors: NonNullable<SalesInvoiceActionState["errors"]> } {
  const errors: NonNullable<SalesInvoiceActionState["errors"]> = {};

  const customerId = (formData.get("partyId") as string | null)?.trim() ?? "";
  const customerName = (formData.get("partyName") as string | null)?.trim() ?? "";
  if (!customerId || !customerName || !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.party = "Pick a customer.";
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
      customerId,
      customerName,
      customerCompany: (formData.get("partyCompany") as string | null)?.trim() ?? "",
      customerEmail: (formData.get("partyEmail") as string | null)?.trim() ?? "",
      customerGstin: ((formData.get("partyGstin") as string | null) ?? "").trim().toUpperCase(),
      status: statusRaw as SalesInvoiceStatus,
      currency,
      invoiceDate: invoiceDate as Date,
      dueDate,
      discount,
      notes,
      items,
    },
  };
}

async function verifyCustomer(
  workspaceId: string,
  customerId: string,
  actor: { id: string; scopedToSelf: boolean },
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(customerId)) return false;
  const filter: Record<string, unknown> = {
    _id: customerId,
    workspace: workspaceId,
  };
  if (actor.scopedToSelf) filter.assignedTo = actor.id;
  return Boolean(await Customer.exists(filter));
}

function customerSnapshot(d: ParsedForm) {
  return {
    refId: new mongoose.Types.ObjectId(d.customerId),
    name: d.customerName,
    company: d.customerCompany,
    email: d.customerEmail,
    gstin: d.customerGstin,
  };
}

// Reconcile derived status from total/amountPaid. If the user explicitly
// picked "cancelled", we keep that. Otherwise we infer paid/partial/unpaid
// from amounts and use the user-chosen "overdue" if still appropriate.
function reconcileStatus(
  pickedStatus: SalesInvoiceStatus,
  total: number,
  amountPaid: number,
  dueDate: Date | null,
): SalesInvoiceStatus {
  if (pickedStatus === "cancelled") return "cancelled";
  if (amountPaid >= total && total > 0) return "paid";
  if (amountPaid > 0) return "partial";
  if (dueDate && dueDate < new Date()) return "overdue";
  return "unpaid";
}

export async function createSalesInvoice(
  workspaceId: string,
  _prev: SalesInvoiceActionState,
  formData: FormData,
): Promise<SalesInvoiceActionState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };

  const parsed = parseForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  if (
    !canManageVoucher(ctx.role, ctx.session.user.id, {
      createdBy: ctx.session.user.id,
      assignedTo: null,
    })
  ) {
    return { formError: "You don't have permission to create sales invoices." };
  }

  const valid = await verifyCustomer(workspaceId, d.customerId, {
    id: ctx.session.user.id,
    scopedToSelf: ctx.role === "sales_executive",
  });
  if (!valid) {
    return {
      errors: {
        party:
          ctx.role === "sales_executive"
            ? "Pick a customer assigned to you."
            : "That customer is no longer in this workspace.",
      },
    };
  }

  const persistedItems = (d.items ?? []).map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(d.items ?? [], d.discount);
  const finalStatus = reconcileStatus(d.status, totals.total, 0, d.dueDate);

  const assignedTo = canManageAnyVoucher(ctx.role) ? null : ctx.session.user.id;

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextInvoiceNumber(
      workspaceId,
      d.invoiceDate.getFullYear(),
    );
    try {
      await SalesInvoice.create({
        workspace: workspaceId,
        number,
        customer: customerSnapshot(d),
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
        assignedTo,
      });
      revalidatePath(`/workspace/${workspaceId}/sale-invoices`);
      redirect(`/workspace/${workspaceId}/sale-invoices`);
    } catch (err) {
      const e = err as { code?: number; digest?: string };
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
      if (e?.code === 11000) continue;
      console.error("[createSalesInvoice] failed", err);
      return { formError: "Couldn't create the sales invoice. Please try again." };
    }
  }
  return { formError: "Couldn't allocate an invoice number. Please try again." };
}

export async function updateSalesInvoice(
  workspaceId: string,
  invoiceId: string,
  _prev: SalesInvoiceActionState,
  formData: FormData,
): Promise<SalesInvoiceActionState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return { formError: "Invalid invoice id." };
  }

  const existing = await SalesInvoice.findOne({
    _id: invoiceId,
    workspace: workspaceId,
  });
  if (!existing) return { formError: "Sales invoice not found." };

  const ownerIds = {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  };
  if (!canManageVoucher(ctx.role, ctx.session.user.id, ownerIds)) {
    return { formError: "You can't edit this invoice." };
  }

  const parsed = parseForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  const customerUnchanged =
    String(existing.customer.refId ?? "") === d.customerId;
  const scopedToSelf = ctx.role === "sales_executive" && !customerUnchanged;
  const valid = await verifyCustomer(workspaceId, d.customerId, {
    id: ctx.session.user.id,
    scopedToSelf,
  });
  if (!valid) {
    return {
      errors: {
        party:
          ctx.role === "sales_executive"
            ? "Pick a customer assigned to you."
            : "That customer is no longer in this workspace.",
      },
    };
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

  existing.customer = customerSnapshot(d) as unknown as typeof existing.customer;
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
    console.error("[updateSalesInvoice] failed", err);
    return { formError: "Couldn't save the invoice. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/sale-invoices`);
  revalidatePath(`/workspace/${workspaceId}/sale-invoices/${invoiceId}/edit`);
  revalidatePath(`/workspace/${workspaceId}/recovery`);
  redirect(`/workspace/${workspaceId}/sale-invoices`);
}

export async function deleteSalesInvoice(
  workspaceId: string,
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return { ok: false, error: "Invalid invoice id." };
  }
  const existing = await SalesInvoice.findOne({
    _id: invoiceId,
    workspace: workspaceId,
  })
    .select({ createdBy: 1, assignedTo: 1, amountPaid: 1 })
    .lean();
  if (!existing) return { ok: false, error: "Sales invoice not found." };

  const ownerIds = {
    createdBy: String((existing as { createdBy: unknown }).createdBy),
    assignedTo: (existing as { assignedTo: unknown }).assignedTo
      ? String((existing as { assignedTo: unknown }).assignedTo)
      : null,
  };
  if (!canManageVoucher(ctx.role, ctx.session.user.id, ownerIds)) {
    return { ok: false, error: "You can't delete this invoice." };
  }

  // Refuse if money has been collected against it — force a Receipt reversal first.
  const paid = (existing as { amountPaid?: number }).amountPaid ?? 0;
  if (paid > 0) {
    return {
      ok: false,
      error:
        "This invoice already has receipts allocated. Cancel or reverse the receipts first.",
    };
  }

  await SalesInvoice.deleteOne({ _id: invoiceId, workspace: workspaceId });
  revalidatePath(`/workspace/${workspaceId}/sale-invoices`);
  revalidatePath(`/workspace/${workspaceId}/recovery`);
  return { ok: true };
}

// Helper used by the Recovery page to record a quick follow-up note. Keeps the
// collections log lightweight: who, when, free-text note. Returns the new
// follow-up id for optimistic UI use.
export async function recordInvoiceFollowUp(
  workspaceId: string,
  invoiceId: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return { ok: false, error: "Invalid invoice id." };
  }
  const trimmed = note.trim().slice(0, 2000);

  const result = await SalesInvoice.updateOne(
    { _id: invoiceId, workspace: workspaceId },
    {
      $push: {
        followUps: {
          at: new Date(),
          by: new mongoose.Types.ObjectId(ctx.session.user.id),
          note: trimmed,
        },
      },
    },
  );
  if (result.matchedCount === 0) {
    return { ok: false, error: "Invoice not found." };
  }
  revalidatePath(`/workspace/${workspaceId}/recovery`);
  return { ok: true };
}

// Raise a fresh sales invoice from an existing sales order. Copies customer +
// items + discount + notes verbatim, generates a brand-new SI number, links
// the invoice back to the source order via `salesOrder`, and flips the
// order's status to "invoiced". Redirects to the new invoice's edit page on
// success so the user can fill in payment-specific fields (due date, terms).
export async function convertSalesOrderToInvoice(
  workspaceId: string,
  orderId: string,
): Promise<{ ok: false; error: string } | void> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return { ok: false, error: "Invalid sales order id." };
  }

  const order = await SalesOrder.findOne({
    _id: orderId,
    workspace: workspaceId,
  });
  if (!order) return { ok: false, error: "Sales order not found." };

  if (order.status === "invoiced" || order.status === "cancelled") {
    return {
      ok: false,
      error: "This order can't be converted in its current state.",
    };
  }
  if (!order.items || order.items.length === 0) {
    return { ok: false, error: "Order has no items to invoice." };
  }

  // Caller must be able to manage the source order AND have invoice-create
  // rights. canManageVoucher handles the sales_executive own/assigned scope.
  const canManageOrder = canManageVoucher(ctx.role, ctx.session.user.id, {
    createdBy: String(order.createdBy),
    assignedTo: order.assignedTo ? String(order.assignedTo) : null,
  });
  if (!canManageOrder || !canManageAnyVoucher(ctx.role)) {
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

  // Preserve the order's owner unless the caller is scoped (sales_executive),
  // in which case the invoice should be theirs (mirrors createSalesInvoice).
  const assignedTo = canManageAnyVoucher(ctx.role)
    ? order.assignedTo
      ? new mongoose.Types.ObjectId(String(order.assignedTo))
      : null
    : new mongoose.Types.ObjectId(ctx.session.user.id);

  let createdId: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextInvoiceNumber(
      workspaceId,
      invoiceDate.getFullYear(),
    );
    try {
      const created = await SalesInvoice.create({
        workspace: workspaceId,
        number,
        customer: {
          refId: order.customer.refId ?? null,
          name: order.customer.name,
          company: order.customer.company ?? "",
          email: order.customer.email ?? "",
          gstin: order.customer.gstin ?? "",
        },
        salesOrder: order._id,
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
        terms: "",
        createdBy: new mongoose.Types.ObjectId(ctx.session.user.id),
        assignedTo,
      });
      createdId = String(created._id);
      break;
    } catch (err) {
      const e = err as { code?: number; digest?: string };
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
      if (e?.code === 11000) continue;
      console.error("[convertSalesOrderToInvoice] create failed", err);
      return {
        ok: false,
        error: "Couldn't create the invoice. Please try again.",
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
    await SalesOrder.updateOne(
      { _id: order._id, workspace: workspaceId },
      { $set: { status: "invoiced" } },
    );
  } catch (err) {
    console.error(
      "[convertSalesOrderToInvoice] order status update failed",
      err,
    );
  }

  revalidatePath(`/workspace/${workspaceId}/sales-orders`);
  revalidatePath(`/workspace/${workspaceId}/sales-orders/${orderId}/edit`);
  revalidatePath(`/workspace/${workspaceId}/sale-invoices`);
  // The query param drives a one-time success popup on the destination page,
  // which the popup itself clears via router.replace once dismissed.
  redirect(
    `/workspace/${workspaceId}/sale-invoices/${createdId}/edit?fromOrder=${encodeURIComponent(
      order.number,
    )}`,
  );
}
