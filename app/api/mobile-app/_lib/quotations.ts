import "server-only";
import mongoose from "mongoose";
import Quotation from "@/models/quotation";
import Customer from "@/models/customer";
import Lead from "@/models/lead";
import {
  QUOTATION_RECIPIENT_KINDS,
  QUOTATION_STATUSES,
  canManageAnyQuotation,
  canManageQuotation,
  canViewAllQuotations,
  canViewQuotations,
  computeTotals,
  lineSubtotal,
  type QuotationRecipientKind,
  type QuotationStatus,
} from "@/lib/quotation";
import { escapeRegex, type VoucherItemInput } from "@/lib/voucher";
import {
  nextDocNumber,
  normalizeVoucherItems,
} from "@/lib/services/voucher-service";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";
import {
  listEnvelope,
  parsePagination,
  parseSort,
  serialize,
} from "@/lib/mobile-api";

export function requireQuotationViewer(ctx: MobileWorkspaceContext): void {
  if (!canViewQuotations(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export function quotationVisibilityFilter(
  ctx: MobileWorkspaceContext,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    workspace: String(ctx.workspace._id),
  };
  if (!canViewAllQuotations(ctx.role)) {
    base.$or = [{ createdBy: ctx.userId }, { assignedTo: ctx.userId }];
  }
  return base;
}

type ParsedQuotationBody = {
  recipient: {
    kind: QuotationRecipientKind;
    refId: string;
    name: string;
    company: string;
    email: string;
  };
  status: QuotationStatus;
  currency: string;
  issueDate: Date;
  validUntil: Date | null;
  discount: number;
  notes: string;
  terms: string;
  assignedTo: string | null;
  items: VoucherItemInput[];
};

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Mirrors pickResultFields from quotations/actions.ts, reading a JSON body.
export function parseQuotationBody(
  body: Record<string, unknown>,
): ParsedQuotationBody {
  const errors: Record<string, string> = {};
  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";

  const recipientKind = str("recipientKind");
  const recipientId = str("recipientId");
  const recipientName = str("recipientName");

  const kindValid = (QUOTATION_RECIPIENT_KINDS as readonly string[]).includes(
    recipientKind,
  );
  if (!kindValid || !recipientName) {
    errors.recipient = "Pick a customer or lead, or enter a custom recipient.";
  } else if (
    recipientKind !== "custom" &&
    !mongoose.Types.ObjectId.isValid(recipientId)
  ) {
    errors.recipient = "Pick a customer or lead, or enter a custom recipient.";
  }

  const status = str("status") || "draft";
  if (!(QUOTATION_STATUSES as readonly string[]).includes(status))
    errors.status = "Pick a status.";

  const currency = (str("currency") || "INR").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    errors.currency = "Currency must be a 3-letter code.";

  const issueDate = parseDateValue(body.issueDate);
  if (!issueDate) errors.issueDate = "Issue date is required.";
  const validUntil = parseDateValue(body.validUntil);
  if (issueDate && validUntil && validUntil < issueDate) {
    errors.validUntil = "Valid-until can't be before the issue date.";
  }

  const discountRaw = Number(body.discount ?? 0);
  const discount =
    Number.isFinite(discountRaw) && discountRaw >= 0 ? discountRaw : 0;

  const notes = str("notes");
  const terms = str("terms");
  if (notes.length > 4000) errors.notes = "Notes are too long (max 4000).";
  if (terms.length > 4000) errors.terms = "Terms are too long (max 4000).";

  const items = normalizeVoucherItems(body.items ?? []);
  if (!items || items.length === 0) {
    errors.items = "Add at least one line item.";
  } else if (items.some((it) => !it.description)) {
    errors.items = "Every line item needs a description.";
  } else if (items.length > 100) {
    errors.items = "Too many line items (max 100).";
  }

  const assignedRaw = str("assignedTo");
  const assignedTo =
    assignedRaw && mongoose.Types.ObjectId.isValid(assignedRaw)
      ? assignedRaw
      : null;

  if (Object.keys(errors).length > 0) {
    throw new MobileApiError(422, "validation_failed", errors);
  }

  return {
    recipient: {
      kind: recipientKind as QuotationRecipientKind,
      refId: recipientKind === "custom" ? "" : recipientId,
      name: recipientName,
      company: str("recipientCompany"),
      email: str("recipientEmail"),
    },
    status: status as QuotationStatus,
    currency,
    issueDate: issueDate as Date,
    validUntil,
    discount,
    notes,
    terms,
    assignedTo,
    items: items as VoucherItemInput[],
  };
}

async function verifyRecipient(
  ctx: MobileWorkspaceContext,
  kind: QuotationRecipientKind,
  refId: string,
  opts: { scopedToSelf: boolean },
): Promise<void> {
  if (kind === "custom") return;
  const workspaceId = String(ctx.workspace._id);
  if (!mongoose.Types.ObjectId.isValid(refId)) {
    throw recipientError(ctx);
  }
  const filter: Record<string, unknown> = {
    _id: refId,
    workspace: workspaceId,
  };
  if (opts.scopedToSelf) filter.assignedTo = ctx.userId;
  const exists =
    kind === "customer"
      ? await Customer.exists(filter)
      : await Lead.exists(filter);
  if (!exists) throw recipientError(ctx);
}

function recipientError(ctx: MobileWorkspaceContext): MobileApiError {
  return new MobileApiError(422, "validation_failed", {
    recipient:
      ctx.role === "sales_executive"
        ? "Pick a contact that's assigned to you."
        : "That contact is no longer in this workspace.",
  });
}

function recipientForPersist(r: ParsedQuotationBody["recipient"]) {
  return {
    kind: r.kind,
    refId:
      r.kind === "custom" || !mongoose.Types.ObjectId.isValid(r.refId)
        ? null
        : new mongoose.Types.ObjectId(r.refId),
    name: r.name,
    company: r.company,
    email: r.email,
  };
}

// Best-effort quotation_created entry on the linked customer/lead timeline.
async function logRecipientActivity(
  workspaceId: string,
  actorId: string,
  recipient: ParsedQuotationBody["recipient"],
  data: {
    quotationId: unknown;
    quotationNumber: string;
    status: string;
    total: number;
    currency: string;
  },
): Promise<void> {
  if (recipient.kind === "custom" || !recipient.refId) return;
  try {
    const activityEntry = {
      type: "quotation_created" as const,
      actor: new mongoose.Types.ObjectId(actorId),
      at: new Date(),
      data,
    };
    if (recipient.kind === "customer") {
      await Customer.updateOne(
        { _id: recipient.refId, workspace: workspaceId },
        { $push: { activity: activityEntry } },
      );
    } else {
      await Lead.updateOne(
        { _id: recipient.refId, workspace: workspaceId },
        { $push: { activity: activityEntry } },
      );
    }
  } catch (err) {
    console.error("[mobile quotations] failed to log CRM activity", err);
  }
}

export async function listQuotations(
  ctx: MobileWorkspaceContext,
  url: URL,
): Promise<Record<string, unknown>> {
  const pagination = parsePagination(url);
  const sort = parseSort(
    url,
    ["createdAt", "updatedAt", "number", "total", "issueDate", "validUntil"],
    { updatedAt: -1 },
  );

  const filter = quotationVisibilityFilter(ctx);

  const status = url.searchParams.get("status") ?? "";
  if ((QUOTATION_STATUSES as readonly string[]).includes(status)) {
    filter.status = status;
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length > 0) {
    const re = new RegExp(escapeRegex(q), "i");
    const search = [
      { number: re },
      { "recipient.name": re },
      { "recipient.company": re },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: search }];
      delete filter.$or;
    } else {
      filter.$or = search;
    }
  }

  const [docs, total] = await Promise.all([
    Quotation.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  return listEnvelope(docs, pagination, total);
}

export async function getQuotation(
  ctx: MobileWorkspaceContext,
  id: string,
): Promise<unknown> {
  const filter = quotationVisibilityFilter(ctx);
  filter._id = id;
  const doc = await Quotation.findOne(filter).lean();
  if (!doc) throw new MobileApiError(404, "quotation_not_found");
  return serialize(doc);
}

export async function createQuotationForMobile(
  ctx: MobileWorkspaceContext,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  if (
    !canManageQuotation(ctx.role, ctx.userId, {
      createdBy: ctx.userId,
      assignedTo: null,
    })
  ) {
    throw new MobileApiError(403, "forbidden");
  }

  const data = parseQuotationBody(body);
  await verifyRecipient(ctx, data.recipient.kind, data.recipient.refId, {
    scopedToSelf: ctx.role === "sales_executive",
  });

  const persistedItems = data.items.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(data.items, data.discount);

  // Sales executives can only assign a quotation to themselves on create.
  const nextAssignedTo = canManageAnyQuotation(ctx.role)
    ? data.assignedTo
    : ctx.userId;

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextDocNumber(
      Quotation,
      workspaceId,
      "Q",
      data.issueDate.getFullYear(),
    );
    try {
      const created = await Quotation.create({
        workspace: workspaceId,
        number,
        recipient: recipientForPersist(data.recipient),
        currency: data.currency,
        issueDate: data.issueDate,
        validUntil: data.validUntil,
        items: persistedItems,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discount: data.discount,
        total: totals.total,
        status: data.status,
        notes: data.notes,
        terms: data.terms,
        createdBy: ctx.userId,
        assignedTo: nextAssignedTo,
      });

      await logRecipientActivity(workspaceId, ctx.userId, data.recipient, {
        quotationId: created._id,
        quotationNumber: number,
        status: data.status,
        total: totals.total,
        currency: data.currency,
      });

      return serialize(created.toObject()) as Record<string, unknown>;
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) continue;
      throw err;
    }
  }
  throw new MobileApiError(409, "number_allocation_failed");
}

export async function updateQuotationForMobile(
  ctx: MobileWorkspaceContext,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const workspaceId = String(ctx.workspace._id);

  const existing = await Quotation.findOne({
    _id: id,
    workspace: workspaceId,
  });
  if (!existing) throw new MobileApiError(404, "quotation_not_found");

  const ownerIds = {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  };
  if (!canManageQuotation(ctx.role, ctx.userId, ownerIds)) {
    throw new MobileApiError(403, "forbidden");
  }

  // Partial semantics: merge over current raw values.
  const obj = existing.toObject();
  const recipient = (obj.recipient ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    recipientKind: recipient.kind ?? "custom",
    recipientId: recipient.refId ? String(recipient.refId) : "",
    recipientName: recipient.name ?? "",
    recipientCompany: recipient.company ?? "",
    recipientEmail: recipient.email ?? "",
    status: obj.status,
    currency: obj.currency,
    issueDate: obj.issueDate
      ? new Date(obj.issueDate as Date).toISOString()
      : "",
    validUntil: obj.validUntil
      ? new Date(obj.validUntil as Date).toISOString()
      : "",
    discount: obj.discount ?? 0,
    notes: obj.notes ?? "",
    terms: obj.terms ?? "",
    assignedTo: obj.assignedTo ? String(obj.assignedTo) : "",
    items: (obj.items ?? []) as unknown[],
    ...body,
  };
  const data = parseQuotationBody(merged);

  // Skip the assigned-to-me check when the recipient wasn't changed, so
  // executives can still edit a quotation whose contact was reassigned away.
  const recipientUnchanged =
    recipient.kind === data.recipient.kind &&
    String(recipient.refId ?? "") === data.recipient.refId;
  await verifyRecipient(ctx, data.recipient.kind, data.recipient.refId, {
    scopedToSelf: ctx.role === "sales_executive" && !recipientUnchanged,
  });

  const persistedItems = data.items.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(data.items, data.discount);

  // Sales executives can't reassign quotations away from themselves.
  const nextAssignedTo = canManageAnyQuotation(ctx.role)
    ? data.assignedTo
      ? new mongoose.Types.ObjectId(data.assignedTo)
      : null
    : (existing.assignedTo ?? null);

  existing.recipient = recipientForPersist(
    data.recipient,
  ) as unknown as typeof existing.recipient;
  existing.currency = data.currency;
  existing.issueDate = data.issueDate;
  existing.validUntil = data.validUntil;
  existing.items = persistedItems as unknown as typeof existing.items;
  existing.subtotal = totals.subtotal;
  existing.taxTotal = totals.taxTotal;
  existing.discount = data.discount;
  existing.total = totals.total;
  existing.status = data.status;
  existing.notes = data.notes;
  existing.terms = data.terms;
  existing.assignedTo = nextAssignedTo as typeof existing.assignedTo;

  await existing.save();

  return serialize(existing.toObject()) as Record<string, unknown>;
}

export async function deleteQuotationForMobile(
  ctx: MobileWorkspaceContext,
  id: string,
): Promise<void> {
  const workspaceId = String(ctx.workspace._id);

  const existing = await Quotation.findOne({ _id: id, workspace: workspaceId })
    .select({ createdBy: 1, assignedTo: 1 })
    .lean();
  if (!existing) throw new MobileApiError(404, "quotation_not_found");

  const ownerIds = {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  };
  if (!canManageQuotation(ctx.role, ctx.userId, ownerIds)) {
    throw new MobileApiError(403, "forbidden");
  }

  await Quotation.deleteOne({ _id: id, workspace: workspaceId });
}

// Unified customer + lead search for the recipient picker (up to 8 of each).
export async function searchRecipients(
  ctx: MobileWorkspaceContext,
  query: string,
): Promise<
  Array<{
    kind: "customer" | "lead";
    id: string;
    name: string;
    company: string;
    email: string;
  }>
> {
  const workspaceId = String(ctx.workspace._id);
  const trimmed = query.trim();
  if (trimmed.length > 60) return [];

  const scopedToSelf = ctx.role === "sales_executive";
  const baseFilter: Record<string, unknown> = { workspace: workspaceId };
  if (scopedToSelf) baseFilter.assignedTo = ctx.userId;

  const searchFilter = trimmed
    ? {
        ...baseFilter,
        $or: [
          { name: new RegExp(escapeRegex(trimmed), "i") },
          { company: new RegExp(escapeRegex(trimmed), "i") },
          { email: new RegExp(escapeRegex(trimmed), "i") },
        ],
      }
    : baseFilter;

  type Row = {
    _id: mongoose.Types.ObjectId;
    name: string;
    company?: string;
    email?: string | null;
  };

  const [customers, leads] = await Promise.all([
    Customer.find(searchFilter)
      .select({ name: 1, company: 1, email: 1 })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean()
      .exec() as Promise<Row[]>,
    Lead.find(searchFilter)
      .select({ name: 1, company: 1, email: 1 })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean()
      .exec() as Promise<Row[]>,
  ]);

  return [
    ...customers.map((c) => ({
      kind: "customer" as const,
      id: String(c._id),
      name: c.name,
      company: c.company ?? "",
      email: c.email ?? "",
    })),
    ...leads.map((l) => ({
      kind: "lead" as const,
      id: String(l._id),
      name: l.name,
      company: l.company ?? "",
      email: l.email ?? "",
    })),
  ];
}
