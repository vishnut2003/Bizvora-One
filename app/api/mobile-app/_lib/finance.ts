import "server-only";
import mongoose, { type Model } from "mongoose";
import Customer from "@/models/customer";
import Vendor from "@/models/vendor";
import {
  canManageAnyVoucher,
  canManagePurchases,
  canManageVoucher,
  canViewAllVouchers,
  canViewPurchases,
  canViewVouchers,
  computeTotals,
  escapeRegex,
  lineSubtotal,
  type VoucherItemInput,
} from "@/lib/voucher";
import {
  nextDocNumber,
  normalizeVoucherItems,
  reconcileInvoiceStatus,
} from "@/lib/services/voucher-service";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";
import {
  listEnvelope,
  parsePagination,
  parseSort,
  serialize,
  type Pagination,
} from "@/lib/mobile-api";

// One config per Tally-style voucher document type (orders + invoices).
// Receipts/payments (allocations) and quotations (recipient kinds) have
// their own dedicated modules.
export type VoucherDocConfig = {
  model: Model<never> | Model<unknown>;
  notFoundCode: string;
  prefix: "SO" | "SI" | "PO" | "PI";
  side: "sales" | "purchase";
  isInvoice: boolean;
  statuses: readonly string[];
  defaultStatus: string;
  // Document field names for the two dates, e.g. orderDate/expectedDate.
  primaryDateField: string;
  primaryDateRequiredError: string;
  secondaryDateField: string;
  secondaryDateOrderError: string;
  hasVendorBillNumber?: boolean;
};

type VoucherDoc = {
  _id: unknown;
  createdBy: unknown;
  assignedTo?: unknown;
  amountPaid?: number;
  status: string;
  customer?: { refId?: unknown };
  vendor?: { refId?: unknown };
  set(field: string, value: unknown): void;
  get(field: string): unknown;
  toObject(): Record<string, unknown>;
  save(): Promise<unknown>;
};

export function requireVoucherViewer(
  config: Pick<VoucherDocConfig, "side">,
  ctx: MobileWorkspaceContext,
): void {
  const allowed =
    config.side === "purchase"
      ? canViewPurchases(ctx.role)
      : canViewVouchers(ctx.role);
  if (!allowed) throw new MobileApiError(403, "forbidden");
}

function canManageDoc(
  config: Pick<VoucherDocConfig, "side">,
  ctx: MobileWorkspaceContext,
  ownerIds: { createdBy: string; assignedTo: string | null },
): boolean {
  return config.side === "purchase"
    ? canManagePurchases(ctx.role)
    : canManageVoucher(ctx.role, ctx.userId, ownerIds);
}

function canManageAnyDoc(
  config: Pick<VoucherDocConfig, "side">,
  ctx: MobileWorkspaceContext,
): boolean {
  return config.side === "purchase"
    ? canManagePurchases(ctx.role)
    : canManageAnyVoucher(ctx.role);
}

// Sales executives are scoped to vouchers they created or were assigned.
export function voucherVisibilityFilter(
  config: Pick<VoucherDocConfig, "side">,
  ctx: MobileWorkspaceContext,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    workspace: String(ctx.workspace._id),
  };
  if (config.side === "sales" && !canViewAllVouchers(ctx.role)) {
    base.$or = [{ createdBy: ctx.userId }, { assignedTo: ctx.userId }];
  }
  return base;
}

export type ParsedVoucherBody = {
  partyId: string;
  partyName: string;
  partyCompany: string;
  partyEmail: string;
  partyGstin: string;
  status: string;
  currency: string;
  primaryDate: Date;
  secondaryDate: Date | null;
  discount: number;
  notes: string;
  vendorBillNumber: string;
  items: VoucherItemInput[];
};

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Mirrors the parseForm validation of the voucher server actions, reading
// from a JSON body. Field names use the generic party/primaryDate wire
// convention documented in docs/mobile-api.md.
export function parseVoucherDocBody(
  config: VoucherDocConfig,
  body: Record<string, unknown>,
): ParsedVoucherBody {
  const errors: Record<string, string> = {};
  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";

  const partyId = str("partyId");
  const partyName = str("partyName");
  if (!partyId || !partyName || !mongoose.Types.ObjectId.isValid(partyId)) {
    errors.party =
      config.side === "purchase" ? "Pick a vendor." : "Pick a customer.";
  }

  const status = str("status") || config.defaultStatus;
  if (!config.statuses.includes(status)) errors.status = "Pick a status.";

  const currency = (str("currency") || "INR").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    errors.currency = "Currency must be a 3-letter code.";

  const primaryDate = parseDateValue(body.primaryDate);
  if (!primaryDate) errors.primaryDate = config.primaryDateRequiredError;
  const secondaryDate = parseDateValue(body.secondaryDate);
  if (primaryDate && secondaryDate && secondaryDate < primaryDate) {
    errors.secondaryDate = config.secondaryDateOrderError;
  }

  const discountRaw = Number(body.discount ?? 0);
  const discount =
    Number.isFinite(discountRaw) && discountRaw >= 0 ? discountRaw : 0;

  const notes = str("notes");
  if (notes.length > 4000) errors.notes = "Notes are too long.";

  const items = normalizeVoucherItems(body.items ?? []);
  if (!items || items.length === 0)
    errors.items = "Add at least one line item.";
  else if (items.some((it) => !it.description))
    errors.items = "Every line item needs a description.";
  else if (items.length > 100) errors.items = "Too many line items (max 100).";

  if (Object.keys(errors).length > 0 || !items) {
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
    primaryDate: primaryDate as Date,
    secondaryDate,
    discount,
    notes,
    vendorBillNumber: config.hasVendorBillNumber
      ? str("vendorBillNumber").slice(0, 64)
      : "",
    items,
  };
}

// Verifies the party exists in the workspace; sales executives can only
// reference customers assigned to them (mirrors verifyCustomer).
async function verifyParty(
  config: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  partyId: string,
  opts: { scopedToSelf: boolean },
): Promise<void> {
  const workspaceId = String(ctx.workspace._id);
  let exists = false;
  if (config.side === "purchase") {
    exists = Boolean(await Vendor.exists({ _id: partyId, workspace: workspaceId }));
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

function partySnapshot(d: ParsedVoucherBody) {
  return {
    refId: new mongoose.Types.ObjectId(d.partyId),
    name: d.partyName,
    company: d.partyCompany,
    email: d.partyEmail,
    gstin: d.partyGstin,
  };
}

function partyField(config: VoucherDocConfig): "customer" | "vendor" {
  return config.side === "purchase" ? "vendor" : "customer";
}

export async function listVoucherDocs(
  config: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  url: URL,
): Promise<Record<string, unknown>> {
  const pagination: Pagination = parsePagination(url);
  const sort = parseSort(
    url,
    ["createdAt", "updatedAt", "number", "total", config.primaryDateField],
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
      { [`${partyField(config)}.name`]: re },
      { [`${partyField(config)}.company`]: re },
    ];
    // Combine with any visibility $or via $and.
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

export async function getVoucherDoc(
  config: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  id: string,
): Promise<unknown> {
  const filter = voucherVisibilityFilter(config, ctx);
  filter._id = id;
  const doc = await (config.model as Model<unknown>).findOne(filter).lean();
  if (!doc) throw new MobileApiError(404, config.notFoundCode);
  return serialize(doc);
}

export async function createVoucherDoc(
  config: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  if (
    !canManageDoc(config, ctx, { createdBy: ctx.userId, assignedTo: null })
  ) {
    throw new MobileApiError(403, "forbidden");
  }

  const d = parseVoucherDocBody(config, body);
  await verifyParty(config, ctx, d.partyId, {
    scopedToSelf: ctx.role === "sales_executive",
  });

  const persistedItems = d.items.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(d.items, d.discount);
  const finalStatus = config.isInvoice
    ? reconcileInvoiceStatus(d.status, totals.total, 0, d.secondaryDate)
    : d.status;

  const assignedTo = canManageAnyDoc(config, ctx) ? null : ctx.userId;

  const model = config.model as Model<unknown>;
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextDocNumber(
      config.model,
      workspaceId,
      config.prefix,
      d.primaryDate.getFullYear(),
    );
    try {
      const created = (await model.create({
        workspace: workspaceId,
        number,
        [partyField(config)]: partySnapshot(d),
        currency: d.currency,
        [config.primaryDateField]: d.primaryDate,
        [config.secondaryDateField]: d.secondaryDate,
        items: persistedItems,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discount: d.discount,
        total: totals.total,
        ...(config.isInvoice ? { amountPaid: 0 } : {}),
        ...(config.hasVendorBillNumber
          ? { vendorBillNumber: d.vendorBillNumber }
          : {}),
        status: finalStatus,
        notes: d.notes,
        createdBy: ctx.userId,
        assignedTo,
      })) as { toObject(): Record<string, unknown> };
      return serialize(created.toObject()) as Record<string, unknown>;
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) continue;
      throw err;
    }
  }
  throw new MobileApiError(409, "number_allocation_failed");
}

export async function updateVoucherDoc(
  config: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  const existing = (await (config.model as Model<unknown>).findOne({
    _id: id,
    workspace: workspaceId,
  })) as VoucherDoc | null;
  if (!existing) throw new MobileApiError(404, config.notFoundCode);

  const ownerIds = {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  };
  if (!canManageDoc(config, ctx, ownerIds)) {
    throw new MobileApiError(403, "forbidden");
  }

  // Partial semantics: merge the body over the doc's current raw values,
  // then run the same full validation as the web edit form.
  const obj = existing.toObject();
  const party = (obj[partyField(config)] ?? {}) as Record<string, unknown>;
  const primary = obj[config.primaryDateField];
  const secondary = obj[config.secondaryDateField];
  const merged: Record<string, unknown> = {
    partyId: party.refId ? String(party.refId) : "",
    partyName: party.name ?? "",
    partyCompany: party.company ?? "",
    partyEmail: party.email ?? "",
    partyGstin: party.gstin ?? "",
    status: obj.status,
    currency: obj.currency,
    primaryDate: primary ? new Date(primary as Date).toISOString() : "",
    secondaryDate: secondary ? new Date(secondary as Date).toISOString() : "",
    discount: obj.discount ?? 0,
    notes: obj.notes ?? "",
    ...(config.hasVendorBillNumber
      ? { vendorBillNumber: obj.vendorBillNumber ?? "" }
      : {}),
    items: (obj.items ?? []) as unknown[],
    ...body,
  };
  const d = parseVoucherDocBody(config, merged);

  // Skip the assigned-to-me scope check when the party wasn't changed, so
  // executives can still edit a voucher whose contact was reassigned away.
  const partyUnchanged = String(party.refId ?? "") === d.partyId;
  await verifyParty(config, ctx, d.partyId, {
    scopedToSelf: ctx.role === "sales_executive" && !partyUnchanged,
  });

  const persistedItems = d.items.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(d.items, d.discount);
  const finalStatus = config.isInvoice
    ? reconcileInvoiceStatus(
        d.status,
        totals.total,
        existing.amountPaid ?? 0,
        d.secondaryDate,
      )
    : d.status;

  existing.set(partyField(config), partySnapshot(d));
  existing.set("currency", d.currency);
  existing.set(config.primaryDateField, d.primaryDate);
  existing.set(config.secondaryDateField, d.secondaryDate);
  existing.set("items", persistedItems);
  existing.set("subtotal", totals.subtotal);
  existing.set("taxTotal", totals.taxTotal);
  existing.set("discount", d.discount);
  existing.set("total", totals.total);
  existing.set("status", finalStatus);
  existing.set("notes", d.notes);
  if (config.hasVendorBillNumber) {
    existing.set("vendorBillNumber", d.vendorBillNumber);
  }

  await existing.save();

  return serialize(existing.toObject()) as Record<string, unknown>;
}

/**
 * Raise a fresh invoice from an existing order (mirrors
 * convertSalesOrderToInvoice / convertPurchaseOrderToInvoice): copies party +
 * items + discount + notes, generates a new number, links back to the source
 * order, and flips the order's status to "invoiced".
 */
export async function convertOrderToInvoice(
  orderConfig: VoucherDocConfig,
  invoiceConfig: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  orderId: string,
  orderLinkField: "salesOrder" | "purchaseOrder",
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  type OrderDoc = {
    _id: unknown;
    number: string;
    status: string;
    currency: string;
    discount?: number;
    notes?: string;
    createdBy: unknown;
    assignedTo?: unknown;
    vendorBillNumber?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  } & Record<string, unknown>;

  const order = (await (orderConfig.model as Model<unknown>)
    .findOne({ _id: orderId, workspace: workspaceId })
    .lean()) as OrderDoc | null;
  if (!order) throw new MobileApiError(404, orderConfig.notFoundCode);

  if (order.status === "invoiced" || order.status === "cancelled") {
    throw new MobileApiError(409, "order_not_convertible");
  }
  if (!order.items || order.items.length === 0) {
    throw new MobileApiError(409, "order_has_no_items");
  }

  // Caller must be able to manage the source order AND have invoice-create
  // rights (mirrors the web convert actions).
  const canManageOrder = canManageDoc(orderConfig, ctx, {
    createdBy: String(order.createdBy),
    assignedTo: order.assignedTo ? String(order.assignedTo) : null,
  });
  if (!canManageOrder || !canManageAnyDoc(invoiceConfig, ctx)) {
    throw new MobileApiError(403, "forbidden");
  }

  const itemInputs: VoucherItemInput[] = order.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    taxRate: it.taxRate,
  }));
  const invoiceItems = itemInputs.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(itemInputs, order.discount ?? 0);
  const invoiceDate = new Date();
  const status = reconcileInvoiceStatus("unpaid", totals.total, 0, null);

  // Preserve the order's owner unless the caller is scoped (sales_executive),
  // in which case the invoice should be theirs.
  const assignedTo = canManageAnyDoc(invoiceConfig, ctx)
    ? order.assignedTo
      ? new mongoose.Types.ObjectId(String(order.assignedTo))
      : null
    : new mongoose.Types.ObjectId(ctx.userId);

  const party = (order[partyField(orderConfig)] ?? {}) as Record<
    string,
    unknown
  >;

  const invoiceModel = invoiceConfig.model as Model<unknown>;
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextDocNumber(
      invoiceConfig.model,
      workspaceId,
      invoiceConfig.prefix,
      invoiceDate.getFullYear(),
    );
    try {
      const created = (await invoiceModel.create({
        workspace: workspaceId,
        number,
        [partyField(invoiceConfig)]: {
          refId: party.refId ?? null,
          name: party.name,
          company: party.company ?? "",
          email: party.email ?? "",
          gstin: party.gstin ?? "",
        },
        [orderLinkField]: order._id,
        currency: order.currency,
        [invoiceConfig.primaryDateField]: invoiceDate,
        [invoiceConfig.secondaryDateField]: null,
        items: invoiceItems,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discount: order.discount ?? 0,
        total: totals.total,
        amountPaid: 0,
        ...(invoiceConfig.hasVendorBillNumber ? { vendorBillNumber: "" } : {}),
        status,
        notes: order.notes ?? "",
        createdBy: ctx.userId,
        assignedTo,
      })) as { toObject(): Record<string, unknown> };

      // Flip the source order to "invoiced". Non-fatal — the invoice exists.
      try {
        await (orderConfig.model as Model<unknown>).updateOne(
          { _id: order._id, workspace: workspaceId },
          { $set: { status: "invoiced" } },
        );
      } catch (err) {
        console.error("[mobile finance] order status flip failed", err);
      }

      return serialize(created.toObject()) as Record<string, unknown>;
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) continue;
      throw err;
    }
  }
  throw new MobileApiError(409, "number_allocation_failed");
}

export async function deleteVoucherDoc(
  config: VoucherDocConfig,
  ctx: MobileWorkspaceContext,
  id: string,
): Promise<void> {
  const workspaceId = String(ctx.workspace._id);

  const existing = (await (config.model as Model<unknown>)
    .findOne({ _id: id, workspace: workspaceId })
    .select({ createdBy: 1, assignedTo: 1, amountPaid: 1 })
    .lean()) as {
    createdBy: unknown;
    assignedTo?: unknown;
    amountPaid?: number;
  } | null;
  if (!existing) throw new MobileApiError(404, config.notFoundCode);

  const ownerIds = {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  };
  if (!canManageDoc(config, ctx, ownerIds)) {
    throw new MobileApiError(403, "forbidden");
  }

  // Invoices with collected money must have their receipts reversed first.
  if (config.isInvoice && (existing.amountPaid ?? 0) > 0) {
    throw new MobileApiError(409, "invoice_has_receipts");
  }

  await (config.model as Model<unknown>).deleteOne({
    _id: id,
    workspace: workspaceId,
  });
}
