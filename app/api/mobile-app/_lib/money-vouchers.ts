import "server-only";
import mongoose, { type Model } from "mongoose";
import Customer from "@/models/customer";
import Vendor from "@/models/vendor";
import Receipt from "@/models/receipt";
import Payment from "@/models/payment";
import SalesInvoice from "@/models/sales-invoice";
import PurchaseInvoice from "@/models/purchase-invoice";
import {
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  RECEIPT_STATUSES,
  canManageAnyVoucher,
  canManagePurchases,
  canManageVoucher,
  escapeRegex,
} from "@/lib/voucher";
import {
  nextDocNumber,
  normalizeAllocations,
  refreshPurchaseInvoicesPaid,
  refreshSalesInvoicesPaid,
} from "@/lib/services/voucher-service";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";
import {
  listEnvelope,
  parsePagination,
  parseSort,
  serialize,
} from "@/lib/mobile-api";
import { voucherVisibilityFilter } from "./finance";

// Receipts (money in, against sales invoices) and Payments (money out,
// against purchase invoices) share the allocation machinery; this config
// captures the differences. Mirrors receipts/actions.ts & payments/actions.ts.
export type MoneyVoucherConfig = {
  model: Model<never> | Model<unknown>;
  invoiceModel: Model<never> | Model<unknown>;
  notFoundCode: string;
  prefix: "RCT" | "PMT";
  side: "sales" | "purchase";
  statuses: readonly string[];
  dateField: "receiptDate" | "paymentDate";
  dateRequiredError: string;
  partyField: "customer" | "vendor";
  refreshInvoices: (workspaceId: string, invoiceIds: string[]) => Promise<void>;
  allocationMismatchError: string;
};

export const RECEIPT_CONFIG: MoneyVoucherConfig = {
  model: Receipt,
  invoiceModel: SalesInvoice,
  notFoundCode: "receipt_not_found",
  prefix: "RCT",
  side: "sales",
  statuses: RECEIPT_STATUSES,
  dateField: "receiptDate",
  dateRequiredError: "Receipt date is required.",
  partyField: "customer",
  refreshInvoices: refreshSalesInvoicesPaid,
  allocationMismatchError:
    "One or more allocated invoices don't belong to this customer.",
};

export const PAYMENT_CONFIG: MoneyVoucherConfig = {
  model: Payment,
  invoiceModel: PurchaseInvoice,
  notFoundCode: "payment_not_found",
  prefix: "PMT",
  side: "purchase",
  statuses: PAYMENT_STATUSES,
  dateField: "paymentDate",
  dateRequiredError: "Payment date is required.",
  partyField: "vendor",
  refreshInvoices: refreshPurchaseInvoicesPaid,
  allocationMismatchError:
    "One or more allocated invoices don't belong to this vendor.",
};

type ParsedMoneyBody = {
  partyId: string;
  partyName: string;
  partyCompany: string;
  partyEmail: string;
  partyGstin: string;
  status: string;
  currency: string;
  date: Date;
  amount: number;
  paymentMode: string;
  reference: string;
  notes: string;
  allocations: Array<{ invoiceId: string; amount: number }>;
};

function parseMoneyBody(
  config: MoneyVoucherConfig,
  body: Record<string, unknown>,
): ParsedMoneyBody {
  const errors: Record<string, string> = {};
  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";

  const partyId = str("partyId");
  const partyName = str("partyName");
  if (!partyId || !partyName || !mongoose.Types.ObjectId.isValid(partyId)) {
    errors.party =
      config.side === "purchase" ? "Pick a vendor." : "Pick a customer.";
  }

  const status = str("status") || "cleared";
  if (!config.statuses.includes(status)) errors.status = "Pick a status.";

  const paymentMode = str("paymentMode") || "bank";
  if (!(PAYMENT_MODES as readonly string[]).includes(paymentMode)) {
    errors.paymentMode = "Pick a payment mode.";
  }

  const currency = (str("currency") || "INR").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    errors.currency = "Currency must be a 3-letter code.";

  let date: Date | null = null;
  if (typeof body.date === "string" && body.date) {
    const d = new Date(body.date);
    date = Number.isNaN(d.getTime()) ? null : d;
  }
  if (!date) errors.date = config.dateRequiredError;

  const amountRaw = Number(body.amount ?? 0);
  const amount = Number.isFinite(amountRaw) && amountRaw >= 0 ? amountRaw : 0;
  if (amount <= 0) errors.amount = "Amount must be greater than zero.";

  const allocations = normalizeAllocations(body.allocations);
  if (allocations === null) errors.allocations = "Invalid allocations payload.";
  else if (allocations.length > 50)
    errors.allocations = "Too many allocations (max 50).";
  else if (
    allocations.some((a) => !mongoose.Types.ObjectId.isValid(a.invoiceId))
  ) {
    errors.allocations = "One of the allocated invoices is invalid.";
  } else {
    const allocSum = allocations.reduce((s, a) => s + a.amount, 0);
    if (allocSum > amount + 0.001) {
      errors.allocations = "Allocated amount exceeds the receipt amount.";
    }
  }

  const notes = str("notes");
  if (notes.length > 2000) errors.notes = "Notes are too long.";

  if (Object.keys(errors).length > 0) {
    throw new MobileApiError(422, "validation_failed", errors);
  }

  return {
    partyId,
    partyName,
    partyCompany: str("partyCompany"),
    partyEmail: str("partyEmail"),
    partyGstin: str("partyGstin").toUpperCase(),
    status,
    currency,
    date: date as Date,
    amount,
    paymentMode,
    reference: str("reference").slice(0, 120),
    notes,
    allocations: allocations ?? [],
  };
}

async function verifyMoneyParty(
  config: MoneyVoucherConfig,
  ctx: MobileWorkspaceContext,
  partyId: string,
  opts: { scopedToSelf: boolean },
): Promise<void> {
  const workspaceId = String(ctx.workspace._id);
  let exists = false;
  if (config.side === "purchase") {
    exists = Boolean(
      await Vendor.exists({ _id: partyId, workspace: workspaceId }),
    );
  } else {
    const filter: Record<string, unknown> = {
      _id: partyId,
      workspace: workspaceId,
    };
    if (opts.scopedToSelf) filter.assignedTo = ctx.userId;
    exists = Boolean(await Customer.exists(filter));
  }
  if (!exists) {
    throw new MobileApiError(422, "validation_failed", {
      party:
        config.side === "purchase"
          ? "That vendor is no longer in this workspace."
          : ctx.role === "sales_executive"
            ? "Pick a customer assigned to you."
            : "That customer is no longer in this workspace.",
    });
  }
}

// Verify allocated invoices belong to the same party + workspace, and stamp
// the invoice-number snapshot onto each allocation.
async function buildAllocations(
  config: MoneyVoucherConfig,
  workspaceId: string,
  partyId: string,
  input: Array<{ invoiceId: string; amount: number }>,
) {
  const allocations = input.map((a) => ({
    invoice: new mongoose.Types.ObjectId(a.invoiceId),
    invoiceNumber: "",
    amount: a.amount,
  }));
  if (allocations.length > 0) {
    const invoiceModel = config.invoiceModel as Model<unknown>;
    const numbers = (await invoiceModel
      .find({
        _id: { $in: allocations.map((a) => a.invoice) },
        workspace: workspaceId,
        [`${config.partyField}.refId`]: partyId,
      })
      .select({ number: 1 })
      .lean()) as unknown as Array<{ _id: unknown; number: string }>;
    if (numbers.length !== allocations.length) {
      throw new MobileApiError(422, "validation_failed", {
        allocations: config.allocationMismatchError,
      });
    }
    const numByID = new Map(numbers.map((n) => [String(n._id), n.number]));
    for (const a of allocations) {
      a.invoiceNumber = numByID.get(String(a.invoice)) ?? "";
    }
  }
  return allocations;
}

function requireMoneyManager(
  config: MoneyVoucherConfig,
  ctx: MobileWorkspaceContext,
  ownerIds: { createdBy: string; assignedTo: string | null },
): void {
  const allowed =
    config.side === "purchase"
      ? canManagePurchases(ctx.role)
      : canManageVoucher(ctx.role, ctx.userId, ownerIds);
  if (!allowed) throw new MobileApiError(403, "forbidden");
}

export async function listMoneyVouchers(
  config: MoneyVoucherConfig,
  ctx: MobileWorkspaceContext,
  url: URL,
): Promise<Record<string, unknown>> {
  const pagination = parsePagination(url);
  const sort = parseSort(
    url,
    ["createdAt", "updatedAt", "number", "amount", config.dateField],
    { updatedAt: -1 },
  );

  const filter = voucherVisibilityFilter(config, ctx);

  const status = url.searchParams.get("status") ?? "";
  if (config.statuses.includes(status)) filter.status = status;

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length > 0) {
    const re = new RegExp(escapeRegex(q), "i");
    const search = [
      { number: re },
      { [`${config.partyField}.name`]: re },
      { reference: re },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: search }];
      delete filter.$or;
    } else {
      filter.$or = search;
    }
  }

  const model = config.model as Model<unknown>;
  const [docs, total] = await Promise.all([
    model.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
    model.countDocuments(filter),
  ]);

  return listEnvelope(docs as unknown[], pagination, total);
}

export async function getMoneyVoucher(
  config: MoneyVoucherConfig,
  ctx: MobileWorkspaceContext,
  id: string,
): Promise<unknown> {
  const filter = voucherVisibilityFilter(config, ctx);
  filter._id = id;
  const doc = await (config.model as Model<unknown>).findOne(filter).lean();
  if (!doc) throw new MobileApiError(404, config.notFoundCode);
  return serialize(doc);
}

export async function createMoneyVoucher(
  config: MoneyVoucherConfig,
  ctx: MobileWorkspaceContext,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  requireMoneyManager(config, ctx, {
    createdBy: ctx.userId,
    assignedTo: null,
  });

  const d = parseMoneyBody(config, body);
  await verifyMoneyParty(config, ctx, d.partyId, {
    scopedToSelf: ctx.role === "sales_executive",
  });

  const allocations = await buildAllocations(
    config,
    workspaceId,
    d.partyId,
    d.allocations,
  );

  const manageAny =
    config.side === "purchase"
      ? canManagePurchases(ctx.role)
      : canManageAnyVoucher(ctx.role);
  const assignedTo = manageAny ? null : ctx.userId;

  const model = config.model as Model<unknown>;
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextDocNumber(
      config.model,
      workspaceId,
      config.prefix,
      d.date.getFullYear(),
    );
    try {
      const created = (await model.create({
        workspace: workspaceId,
        number,
        [config.partyField]: {
          refId: new mongoose.Types.ObjectId(d.partyId),
          name: d.partyName,
          company: d.partyCompany,
          email: d.partyEmail,
          gstin: d.partyGstin,
        },
        currency: d.currency,
        [config.dateField]: d.date,
        amount: d.amount,
        paymentMode: d.paymentMode,
        reference: d.reference,
        allocations,
        status: d.status,
        notes: d.notes,
        createdBy: ctx.userId,
        assignedTo,
      })) as { toObject(): Record<string, unknown> };

      if (d.status !== "cancelled" && d.allocations.length > 0) {
        await config.refreshInvoices(
          workspaceId,
          d.allocations.map((a) => a.invoiceId),
        );
      }
      return serialize(created.toObject()) as Record<string, unknown>;
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) continue;
      throw err;
    }
  }
  throw new MobileApiError(409, "number_allocation_failed");
}

export async function updateMoneyVoucher(
  config: MoneyVoucherConfig,
  ctx: MobileWorkspaceContext,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  type MoneyDoc = {
    _id: unknown;
    createdBy: unknown;
    assignedTo?: unknown;
    allocations?: Array<{ invoice: unknown }>;
    set(field: string, value: unknown): void;
    toObject(): Record<string, unknown>;
    save(): Promise<unknown>;
  };
  const existing = (await (config.model as Model<unknown>).findOne({
    _id: id,
    workspace: workspaceId,
  })) as MoneyDoc | null;
  if (!existing) throw new MobileApiError(404, config.notFoundCode);

  requireMoneyManager(config, ctx, {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  });

  // Partial semantics: merge over current raw values.
  const obj = existing.toObject();
  const party = (obj[config.partyField] ?? {}) as Record<string, unknown>;
  const date = obj[config.dateField];
  const merged: Record<string, unknown> = {
    partyId: party.refId ? String(party.refId) : "",
    partyName: party.name ?? "",
    partyCompany: party.company ?? "",
    partyEmail: party.email ?? "",
    partyGstin: party.gstin ?? "",
    status: obj.status,
    currency: obj.currency,
    date: date ? new Date(date as Date).toISOString() : "",
    amount: obj.amount ?? 0,
    paymentMode: obj.paymentMode ?? "bank",
    reference: obj.reference ?? "",
    notes: obj.notes ?? "",
    allocations: ((obj.allocations ?? []) as Array<Record<string, unknown>>).map(
      (a) => ({ invoiceId: String(a.invoice), amount: a.amount }),
    ),
    ...body,
  };
  const d = parseMoneyBody(config, merged);

  const partyUnchanged = String(party.refId ?? "") === d.partyId;
  await verifyMoneyParty(config, ctx, d.partyId, {
    scopedToSelf: ctx.role === "sales_executive" && !partyUnchanged,
  });

  const prevAllocIds = (existing.allocations ?? []).map((a) =>
    String(a.invoice),
  );
  const allocations = await buildAllocations(
    config,
    workspaceId,
    d.partyId,
    d.allocations,
  );

  existing.set(config.partyField, {
    refId: new mongoose.Types.ObjectId(d.partyId),
    name: d.partyName,
    company: d.partyCompany,
    email: d.partyEmail,
    gstin: d.partyGstin,
  });
  existing.set("currency", d.currency);
  existing.set(config.dateField, d.date);
  existing.set("amount", d.amount);
  existing.set("paymentMode", d.paymentMode);
  existing.set("reference", d.reference);
  existing.set("allocations", allocations);
  existing.set("status", d.status);
  existing.set("notes", d.notes);

  await existing.save();

  const affectedInvoiceIds = Array.from(
    new Set([...prevAllocIds, ...allocations.map((a) => String(a.invoice))]),
  );
  if (affectedInvoiceIds.length > 0) {
    await config.refreshInvoices(workspaceId, affectedInvoiceIds);
  }

  return serialize(existing.toObject()) as Record<string, unknown>;
}
