"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Quotation from "@/models/quotation";
import Customer from "@/models/customer";
import Lead from "@/models/lead";
import { getActorRole } from "@/lib/workspace-access";
import {
  QUOTATION_RECIPIENT_KINDS,
  QUOTATION_STATUSES,
  canManageAnyQuotation,
  canManageQuotation,
  canViewQuotations,
  computeTotals,
  lineSubtotal,
  type QuotationRecipientKind,
  type QuotationStatus,
} from "@/lib/quotation";

// `id` is the source CRM record's id for "customer" / "lead" kinds, and
// empty for "custom" (user-entered, no backing record).
export type RecipientResult = {
  kind: QuotationRecipientKind;
  id: string;
  name: string;
  company: string;
  email: string;
};

export type QuotationActionState = {
  ok?: true;
  formError?: string;
  errors?: Partial<
    Record<
      | "recipient"
      | "items"
      | "status"
      | "currency"
      | "issueDate"
      | "validUntil"
      | "discount"
      | "notes"
      | "terms",
      string
    >
  >;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isQuotationStatus(v: string): v is QuotationStatus {
  return (QUOTATION_STATUSES as readonly string[]).includes(v);
}

function isRecipientKind(v: string): v is QuotationRecipientKind {
  return (QUOTATION_RECIPIENT_KINDS as readonly string[]).includes(v);
}

type ParsedItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

function parseItems(raw: string): ParsedItem[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((row) => {
      const r = row as Record<string, unknown>;
      const desc = String(r.description ?? "").trim();
      const qty = Number(r.quantity ?? 0);
      const price = Number(r.unitPrice ?? 0);
      const tax = Number(r.taxRate ?? 0);
      return {
        description: desc,
        quantity: Number.isFinite(qty) && qty >= 0 ? qty : 0,
        unitPrice: Number.isFinite(price) && price >= 0 ? price : 0,
        taxRate:
          Number.isFinite(tax) && tax >= 0 && tax <= 100 ? tax : 0,
      };
    });
  } catch {
    return null;
  }
}

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

type WorkspaceContext = {
  ok: true;
  session: AuthedSession;
  workspaceDoc: Awaited<ReturnType<typeof Workspace.findById>>;
  role: ReturnType<typeof getActorRole>;
};

async function loadWorkspaceForActor(
  workspaceId: string,
): Promise<WorkspaceContext | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, error: "Invalid workspace." };
  }
  await connectDB();
  const workspaceDoc = await Workspace.findById(workspaceId);
  if (!workspaceDoc) {
    return { ok: false, error: "Workspace not found." };
  }
  const role = getActorRole(workspaceDoc, session.user.id);
  if (!canViewQuotations(role)) {
    return {
      ok: false,
      error: "You don't have permission to manage quotations.",
    };
  }
  return {
    ok: true,
    session: session as AuthedSession,
    workspaceDoc,
    role,
  };
}

// Search both customers and leads in one go so the recipient picker can show
// a unified result list. Up to 8 of each (16 total).
export async function searchQuotationRecipients(
  workspaceId: string,
  query: string,
): Promise<
  { ok: true; results: RecipientResult[] } | { ok: false; error: string }
> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return ctx;
  const { session, role } = ctx;
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired." };
  }

  const trimmed = query.trim();
  if (trimmed.length > 60) return { ok: true, results: [] };

  // Sales executives only see customers / leads assigned to them. Everyone
  // else (owner, admin, sales_manager) sees the whole workspace.
  const scopedToSelf = role === "sales_executive";
  const baseFilter: Record<string, unknown> = { workspace: workspaceId };
  if (scopedToSelf) baseFilter.assignedTo = session.user.id;

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

  const results: RecipientResult[] = [];
  for (const c of customers) {
    results.push({
      kind: "customer",
      id: String(c._id),
      name: c.name,
      company: c.company ?? "",
      email: c.email ?? "",
    });
  }
  for (const l of leads) {
    results.push({
      kind: "lead",
      id: String(l._id),
      name: l.name,
      company: l.company ?? "",
      email: l.email ?? "",
    });
  }
  return { ok: true, results };
}

async function nextQuotationNumber(
  workspaceId: string,
  year: number,
): Promise<string> {
  const prefix = `Q-${year}-`;
  // Find the highest-numbered quotation for this workspace+year and increment.
  // Cheap because we sort on the indexed `number` field — for MVP scale this
  // is fine. A two-create race could collide on the unique index; the caller
  // catches that and retries with the next number.
  const last = (await Quotation.findOne({
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
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function pickResultFields(
  formData: FormData,
  context: { issueDate: Date | null; validUntil: Date | null },
): {
  ok: true;
  data: {
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
    items: ParsedItem[];
  };
} | { ok: false; errors: NonNullable<QuotationActionState["errors"]> } {
  const errors: NonNullable<QuotationActionState["errors"]> = {};

  const recipientKindRaw =
    (formData.get("recipientKind") as string | null) ?? "";
  const recipientIdRaw =
    (formData.get("recipientId") as string | null) ?? "";
  const recipientName =
    (formData.get("recipientName") as string | null)?.trim() ?? "";
  const recipientCompany =
    (formData.get("recipientCompany") as string | null)?.trim() ?? "";
  const recipientEmail =
    (formData.get("recipientEmail") as string | null)?.trim() ?? "";

  const kindValid = isRecipientKind(recipientKindRaw);
  if (!kindValid || !recipientName) {
    errors.recipient = "Pick a customer or lead, or enter a custom recipient.";
  } else if (
    recipientKindRaw !== "custom" &&
    !mongoose.Types.ObjectId.isValid(recipientIdRaw)
  ) {
    errors.recipient = "Pick a customer or lead, or enter a custom recipient.";
  }

  const statusRaw = (formData.get("status") as string | null) ?? "draft";
  if (!isQuotationStatus(statusRaw)) errors.status = "Pick a status.";

  const currency = ((formData.get("currency") as string | null) ?? "INR")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "Currency must be a 3-letter code.";
  }

  const issueDate = context.issueDate;
  if (!issueDate) errors.issueDate = "Issue date is required.";
  const validUntil = context.validUntil;
  if (issueDate && validUntil && validUntil < issueDate) {
    errors.validUntil = "Valid-until can't be before the issue date.";
  }

  const discountRaw = Number(
    (formData.get("discount") as string | null) ?? "0",
  );
  const discount = Number.isFinite(discountRaw) && discountRaw >= 0
    ? discountRaw
    : 0;

  const notes = ((formData.get("notes") as string | null) ?? "").trim();
  const terms = ((formData.get("terms") as string | null) ?? "").trim();
  if (notes.length > 4000) errors.notes = "Notes are too long (max 4000).";
  if (terms.length > 4000) errors.terms = "Terms are too long (max 4000).";

  const itemsRaw = (formData.get("items") as string | null) ?? "[]";
  const items = parseItems(itemsRaw);
  if (!items || items.length === 0) {
    errors.items = "Add at least one line item.";
  } else if (items.some((it) => !it.description)) {
    errors.items = "Every line item needs a description.";
  } else if (items.length > 100) {
    errors.items = "Too many line items (max 100).";
  }

  const assignedRaw =
    (formData.get("assignedTo") as string | null)?.trim() ?? "";
  const assignedTo =
    assignedRaw && mongoose.Types.ObjectId.isValid(assignedRaw)
      ? assignedRaw
      : null;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      recipient: {
        kind: recipientKindRaw as QuotationRecipientKind,
        // Custom recipients have no backing CRM record.
        refId:
          recipientKindRaw === "custom"
            ? ""
            : recipientIdRaw,
        name: recipientName,
        company: recipientCompany,
        email: recipientEmail,
      },
      status: statusRaw as QuotationStatus,
      currency,
      issueDate: issueDate as Date,
      validUntil,
      discount,
      notes,
      terms,
      assignedTo,
      items: items as ParsedItem[],
    },
  };
}

async function verifyRecipient(
  workspaceId: string,
  kind: QuotationRecipientKind,
  refId: string,
  actor: { id: string; scopedToSelf: boolean },
): Promise<boolean> {
  // Custom recipients have no backing CRM record — nothing to verify.
  if (kind === "custom") return true;
  if (!mongoose.Types.ObjectId.isValid(refId)) return false;
  // Scope the existence check by `assignedTo` for sales executives so they
  // can't quote against records that aren't theirs even by knowing the id.
  const filter: Record<string, unknown> = {
    _id: refId,
    workspace: workspaceId,
  };
  if (actor.scopedToSelf) filter.assignedTo = actor.id;
  if (kind === "customer") return Boolean(await Customer.exists(filter));
  return Boolean(await Lead.exists(filter));
}

function recipientForPersist(r: {
  kind: QuotationRecipientKind;
  refId: string;
  name: string;
  company: string;
  email: string;
}) {
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

export async function createQuotation(
  workspaceId: string,
  _prev: QuotationActionState,
  formData: FormData,
): Promise<QuotationActionState> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  const { session, role } = ctx;

  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (!canManageQuotation(role, session.user.id, {
    createdBy: session.user.id,
    assignedTo: null,
  })) {
    return { formError: "You don't have permission to create quotations." };
  }

  const issueDate = parseDate(formData.get("issueDate") as string | null);
  const validUntil = parseDate(formData.get("validUntil") as string | null);
  const parsed = pickResultFields(formData, { issueDate, validUntil });
  if (!parsed.ok) return { errors: parsed.errors };
  const data = parsed.data;

  const valid = await verifyRecipient(
    workspaceId,
    data.recipient.kind,
    data.recipient.refId,
    { id: session.user.id, scopedToSelf: role === "sales_executive" },
  );
  if (!valid) {
    return {
      errors: {
        recipient:
          role === "sales_executive"
            ? "Pick a contact that's assigned to you."
            : "That contact is no longer in this workspace.",
      },
    };
  }

  const persistedItems = data.items.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(data.items, data.discount);

  // Sales executives can only assign a quotation to themselves on create.
  const nextAssignedTo = canManageAnyQuotation(role)
    ? data.assignedTo
    : session.user.id;

  let newId: mongoose.Types.ObjectId | null = null;
  let newNumber: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextQuotationNumber(
      workspaceId,
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
        createdBy: session.user.id,
        assignedTo: nextAssignedTo,
      });
      newId = created._id;
      newNumber = number;
      break;
    } catch (err) {
      const e = err as { code?: number };
      if (e?.code === 11000) continue; // duplicate number — retry
      console.error("[createQuotation] failed", err);
      return { formError: "Couldn't create the quotation. Please try again." };
    }
  }
  if (!newId || !newNumber) {
    return {
      formError: "Couldn't allocate a quotation number. Please try again.",
    };
  }

  // Best-effort: write a quotation_created entry on the linked customer or
  // lead's activity timeline. We skip custom recipients (no CRM record) and
  // swallow errors so a logging failure doesn't roll back the quotation.
  if (data.recipient.kind !== "custom" && data.recipient.refId) {
    try {
      const activityEntry = {
        type: "quotation_created" as const,
        actor: new mongoose.Types.ObjectId(session.user.id),
        at: new Date(),
        data: {
          quotationId: newId,
          quotationNumber: newNumber,
          status: data.status,
          total: totals.total,
          currency: data.currency,
        },
      };
      if (data.recipient.kind === "customer") {
        await Customer.updateOne(
          { _id: data.recipient.refId, workspace: workspaceId },
          { $push: { activity: activityEntry } },
        );
        revalidatePath(`/workspace/${workspaceId}/customers`);
      } else if (data.recipient.kind === "lead") {
        await Lead.updateOne(
          { _id: data.recipient.refId, workspace: workspaceId },
          { $push: { activity: activityEntry } },
        );
        revalidatePath(`/workspace/${workspaceId}/leads`);
      }
    } catch (err) {
      console.error("[createQuotation] failed to log CRM activity", err);
    }
  }

  revalidatePath(`/workspace/${workspaceId}/quotations`);
  redirect(`/workspace/${workspaceId}/quotations`);
}

export async function updateQuotation(
  workspaceId: string,
  quotationId: string,
  _prev: QuotationActionState,
  formData: FormData,
): Promise<QuotationActionState> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  const { session, role } = ctx;
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(quotationId)) {
    return { formError: "Invalid quotation id." };
  }

  const existing = await Quotation.findOne({
    _id: quotationId,
    workspace: workspaceId,
  });
  if (!existing) return { formError: "Quotation not found." };

  const ownerIds = {
    createdBy: String(existing.createdBy),
    assignedTo: existing.assignedTo ? String(existing.assignedTo) : null,
  };
  if (!canManageQuotation(role, session.user.id, ownerIds)) {
    return { formError: "You can't edit this quotation." };
  }

  const issueDate = parseDate(formData.get("issueDate") as string | null);
  const validUntil = parseDate(formData.get("validUntil") as string | null);
  const parsed = pickResultFields(formData, { issueDate, validUntil });
  if (!parsed.ok) return { errors: parsed.errors };
  const data = parsed.data;

  // Recipient verification scopes to assigned-only for sales executives,
  // BUT if they didn't change the recipient (same kind + same refId), we
  // skip the assignment check so executives can still edit a quotation
  // whose contact was reassigned away after the quote was first written.
  const recipientUnchanged =
    existing.recipient.kind === data.recipient.kind &&
    String(existing.recipient.refId ?? "") === data.recipient.refId;
  const scopedToSelf =
    role === "sales_executive" && !recipientUnchanged;
  const valid = await verifyRecipient(
    workspaceId,
    data.recipient.kind,
    data.recipient.refId,
    { id: session.user.id, scopedToSelf },
  );
  if (!valid) {
    return {
      errors: {
        recipient:
          role === "sales_executive"
            ? "Pick a contact that's assigned to you."
            : "That contact is no longer in this workspace.",
      },
    };
  }

  const persistedItems = data.items.map((it) => ({
    ...it,
    lineTotal: lineSubtotal(it),
  }));
  const totals = computeTotals(data.items, data.discount);

  // Sales executives can't reassign quotations away from themselves.
  // Cast manager-supplied id to ObjectId so the Mongoose setter sees a
  // shape that matches its declared field type.
  const nextAssignedTo: mongoose.Types.ObjectId | null = canManageAnyQuotation(
    role,
  )
    ? data.assignedTo
      ? new mongoose.Types.ObjectId(data.assignedTo)
      : null
    : (existing.assignedTo ?? null);

  existing.recipient = recipientForPersist(data.recipient) as unknown as typeof existing.recipient;
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
  existing.assignedTo = nextAssignedTo;

  try {
    await existing.save();
  } catch (err) {
    console.error("[updateQuotation] failed", err);
    return { formError: "Couldn't save the quotation. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/quotations`);
  revalidatePath(`/workspace/${workspaceId}/quotations/${quotationId}/edit`);
  redirect(`/workspace/${workspaceId}/quotations`);
}

export async function deleteQuotation(
  workspaceId: string,
  quotationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { session, role } = ctx;
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired." };
  }
  if (!mongoose.Types.ObjectId.isValid(quotationId)) {
    return { ok: false, error: "Invalid quotation id." };
  }

  const existing = await Quotation.findOne({
    _id: quotationId,
    workspace: workspaceId,
  })
    .select({ createdBy: 1, assignedTo: 1 })
    .lean()
    .exec();
  if (!existing) return { ok: false, error: "Quotation not found." };

  const ownerIds = {
    createdBy: String((existing as { createdBy: unknown }).createdBy),
    assignedTo: (existing as { assignedTo: unknown }).assignedTo
      ? String((existing as { assignedTo: unknown }).assignedTo)
      : null,
  };
  if (!canManageQuotation(role, session.user.id, ownerIds)) {
    return { ok: false, error: "You can't delete this quotation." };
  }

  await Quotation.deleteOne({ _id: quotationId, workspace: workspaceId });
  revalidatePath(`/workspace/${workspaceId}/quotations`);
  return { ok: true };
}
