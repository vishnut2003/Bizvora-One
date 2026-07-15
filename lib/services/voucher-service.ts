import "server-only";
import mongoose, { type Model } from "mongoose";
import Receipt from "@/models/receipt";
import Payment from "@/models/payment";
import SalesInvoice from "@/models/sales-invoice";
import PurchaseInvoice from "@/models/purchase-invoice";
import {
  escapeRegex,
  formatVoucherNumber,
  type AllocationInput,
  type VoucherItemInput,
} from "@/lib/voucher";

// Shared voucher machinery for the mobile API. The algorithms mirror the
// per-voucher server actions exactly (numbering, item normalization,
// status reconciliation, allocation recompute); the unique (workspace,
// number) index remains the hard guard against duplicate numbers.
// TODO: migrate the voucher server actions to call these helpers too.

/**
 * Highest-numbered document for this workspace+year, incremented. A race
 * can collide on the unique index; callers catch code 11000 and retry.
 */
export async function nextDocNumber(
  model: Model<never> | Model<unknown>,
  workspaceId: string,
  prefix: string,
  year: number,
): Promise<string> {
  const numberPrefix = `${prefix}-${year}-`;
  const last = (await (model as Model<{ number: string }>)
    .findOne({
      workspace: workspaceId,
      number: new RegExp(`^${escapeRegex(numberPrefix)}`),
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
  return formatVoucherNumber(prefix, year, seq);
}

// JSON-body variant of parseVoucherItems: accepts an actual array (mobile)
// or a JSON string (web form convention).
export function normalizeVoucherItems(
  input: unknown,
): VoucherItemInput[] | null {
  let rows: unknown;
  if (typeof input === "string") {
    try {
      rows = JSON.parse(input);
    } catch {
      return null;
    }
  } else {
    rows = input;
  }
  if (!Array.isArray(rows)) return null;
  return rows.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const desc = String(r.description ?? "").trim();
    const qty = Number(r.quantity ?? 0);
    const price = Number(r.unitPrice ?? 0);
    const tax = Number(r.taxRate ?? 0);
    return {
      description: desc,
      quantity: Number.isFinite(qty) && qty >= 0 ? qty : 0,
      unitPrice: Number.isFinite(price) && price >= 0 ? price : 0,
      taxRate: Number.isFinite(tax) && tax >= 0 && tax <= 100 ? tax : 0,
    };
  });
}

// JSON-body variant of parseAllocations.
export function normalizeAllocations(
  input: unknown,
): AllocationInput[] | null {
  let rows: unknown;
  if (typeof input === "string") {
    try {
      rows = JSON.parse(input);
    } catch {
      return null;
    }
  } else if (input === undefined || input === null) {
    rows = [];
  } else {
    rows = input;
  }
  if (!Array.isArray(rows)) return null;
  return rows
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const invoiceId = String(r.invoiceId ?? "").trim();
      const amount = Number(r.amount ?? 0);
      return {
        invoiceId,
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      };
    })
    .filter((a) => a.invoiceId && a.amount > 0);
}

/**
 * Reconcile derived status from total/amountPaid. If the user explicitly
 * picked "cancelled", keep it. Otherwise infer paid/partial/overdue/unpaid.
 * (Mirrors reconcileStatus in the sales/purchase invoice actions.)
 */
export function reconcileInvoiceStatus<
  S extends "unpaid" | "partial" | "paid" | "overdue" | "cancelled",
>(pickedStatus: S | string, total: number, amountPaid: number, dueDate: Date | null): string {
  if (pickedStatus === "cancelled") return "cancelled";
  if (amountPaid >= total && total > 0) return "paid";
  if (amountPaid > 0) return "partial";
  if (dueDate && dueDate < new Date()) return "overdue";
  return "unpaid";
}

// Recompute amountPaid + status for sales invoices from the canonical sum of
// non-cancelled receipt allocations. (Mirrors refreshInvoices in
// receipts/actions.ts.)
export async function refreshSalesInvoicesPaid(
  workspaceId: string,
  invoiceIds: string[],
): Promise<void> {
  await refreshInvoicesPaid(Receipt, SalesInvoice, workspaceId, invoiceIds);
}

// Purchase-side mirror: payments against purchase invoices.
export async function refreshPurchaseInvoicesPaid(
  workspaceId: string,
  invoiceIds: string[],
): Promise<void> {
  await refreshInvoicesPaid(Payment, PurchaseInvoice, workspaceId, invoiceIds);
}

async function refreshInvoicesPaid(
  voucherModel: Model<never> | Model<unknown>,
  invoiceModel: Model<never> | Model<unknown>,
  workspaceId: string,
  invoiceIds: string[],
): Promise<void> {
  const uniq = Array.from(new Set(invoiceIds)).filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (uniq.length === 0) return;

  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const sums = await (
    voucherModel as Model<unknown>
  ).aggregate<{ _id: mongoose.Types.ObjectId; paid: number }>([
    { $match: { workspace: wsObj, status: { $ne: "cancelled" } } },
    { $unwind: "$allocations" },
    {
      $match: {
        "allocations.invoice": {
          $in: uniq.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    {
      $group: {
        _id: "$allocations.invoice",
        paid: { $sum: "$allocations.amount" },
      },
    },
  ]);
  const byId = new Map(sums.map((s) => [String(s._id), s.paid]));

  type InvoiceDoc = {
    _id: unknown;
    total: number;
    amountPaid: number;
    status: string;
    dueDate?: Date | null;
    save(): Promise<unknown>;
  };
  const invs = (await (invoiceModel as Model<unknown>).find({
    _id: { $in: uniq },
    workspace: workspaceId,
  })) as unknown as InvoiceDoc[];
  const now = new Date();
  for (const inv of invs) {
    const paid = byId.get(String(inv._id)) ?? 0;
    inv.amountPaid = paid;
    if (inv.status === "cancelled") {
      // Cancelled stays cancelled.
    } else if (paid >= inv.total && inv.total > 0) inv.status = "paid";
    else if (paid > 0) inv.status = "partial";
    else if (inv.dueDate && inv.dueDate < now) inv.status = "overdue";
    else inv.status = "unpaid";
    await inv.save();
  }
}
