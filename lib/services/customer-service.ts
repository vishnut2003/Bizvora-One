import "server-only";
import mongoose from "mongoose";
import Customer, {
  CUSTOMER_STATUSES,
  type CustomerActivityType,
  type CustomerStatus,
} from "@/models/customer";
import Lead, {
  LEAD_SOURCES,
  type LeadActivityType,
  type LeadSource,
} from "@/models/lead";
import {
  canConvertLeadToCustomer,
  canCreateCustomer,
  canManageCustomer,
  canViewCustomers,
} from "@/lib/customer";
import { notifyAssignment } from "@/lib/notify-assignment";
import type { UserRole } from "@/lib/user";
import {
  isSalesExecutiveMember,
  isWorkspaceMember,
  parseTags,
  type WorkspaceLike,
} from "@/lib/services/lead-service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9A-Z]{15}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type CustomerActorContext = {
  actorId: string;
  role: UserRole;
  workspace: WorkspaceLike;
};

export type CustomerFieldErrors = Partial<
  Record<
    | "name"
    | "email"
    | "phone"
    | "company"
    | "status"
    | "source"
    | "assignedTo"
    | "gstin"
    | "pan"
    | "noteBody",
    string
  >
>;

export type CustomerInput = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  city: string;
  state: string;
  country: string;
  billingLine1: string;
  billingLine2: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostalCode: string;
  gstin: string;
  pan: string;
  status: CustomerStatus;
  source: LeadSource;
  assignedTo: string | null;
  tags: string[];
  noteBody: string;
};

type CustomerDoc = NonNullable<Awaited<ReturnType<typeof Customer.findOne>>>;

export type CustomerServiceResult =
  | { ok: true; customer: CustomerDoc }
  | {
      ok: false;
      code:
        | "forbidden"
        | "customer_not_found"
        | "cannot_manage"
        | "lead_not_found"
        | "already_converted"
        | "lead_stamp_failed";
    }
  | { ok: false; code: "validation"; fieldErrors: CustomerFieldErrors }
  | { ok: false; code: "save_failed"; message: string };

type CustomerActivityEvent = {
  type: CustomerActivityType;
  actor: mongoose.Types.ObjectId;
  at: Date;
  data: Record<string, unknown>;
};

function makeCustomerEvent(
  type: CustomerActivityType,
  actorId: string,
  at: Date,
  data: Record<string, unknown> = {},
): CustomerActivityEvent {
  return {
    type,
    actor: new mongoose.Types.ObjectId(actorId),
    at,
    data,
  };
}

function makeLeadEvent(
  type: LeadActivityType,
  actorId: string,
  at: Date,
  data: Record<string, unknown> = {},
) {
  return {
    type,
    actor: new mongoose.Types.ObjectId(actorId),
    at,
    data,
  };
}

function isStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}
function isSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

/**
 * Validates raw customer field values into a typed CustomerInput. Single
 * source of the customer validation rules — shared by the web server actions
 * and the mobile API.
 */
export function parseCustomerInput(raw: Record<string, unknown>): {
  data?: CustomerInput;
  errors?: CustomerFieldErrors;
} {
  const name = asString(raw.name).trim();
  const email = asString(raw.email).trim().toLowerCase();
  const phone = asString(raw.phone).trim();
  const company = asString(raw.company).trim();
  const jobTitle = asString(raw.jobTitle).trim();
  const website = asString(raw.website).trim();
  const city = asString(raw.city).trim();
  const state = asString(raw.state).trim();
  const country = asString(raw.country).trim();
  const billingLine1 = asString(raw.billingLine1).trim();
  const billingLine2 = asString(raw.billingLine2).trim();
  const billingCity = asString(raw.billingCity).trim();
  const billingState = asString(raw.billingState).trim();
  const billingCountry = asString(raw.billingCountry).trim();
  const billingPostalCode = asString(raw.billingPostalCode).trim();
  const gstin = asString(raw.gstin).trim().toUpperCase();
  const pan = asString(raw.pan).trim().toUpperCase();
  const statusInput = asString(raw.status);
  const sourceInput = asString(raw.source);
  const assignedTo = asString(raw.assignedTo).trim();
  const noteBody = asString(raw.noteBody).trim();

  const errors: CustomerFieldErrors = {};
  if (name.length < 2) errors.name = "Please enter a name.";
  if (email && !EMAIL_RE.test(email))
    errors.email = "Please enter a valid email.";
  if (!isStatus(statusInput)) errors.status = "Pick a status.";
  if (!isSource(sourceInput)) errors.source = "Pick a source.";
  if (gstin && !GSTIN_RE.test(gstin))
    errors.gstin = "GSTIN must be 15 alphanumeric characters.";
  if (pan && !PAN_RE.test(pan)) errors.pan = "PAN must look like ABCDE1234F.";

  let assignedToId: string | null = null;
  if (assignedTo) {
    if (!mongoose.Types.ObjectId.isValid(assignedTo))
      errors.assignedTo = "Invalid assignee.";
    else assignedToId = assignedTo;
  }

  if (Object.keys(errors).length) return { errors };

  return {
    data: {
      name,
      email,
      phone,
      company,
      jobTitle,
      website,
      city,
      state,
      country,
      billingLine1,
      billingLine2,
      billingCity,
      billingState,
      billingCountry,
      billingPostalCode,
      gstin,
      pan,
      status: statusInput as CustomerStatus,
      source: sourceInput as LeadSource,
      assignedTo: assignedToId,
      tags: parseTags(raw.tags),
      noteBody,
    },
  };
}

function validateAssignee(
  workspace: WorkspaceLike,
  assignedTo: string,
): CustomerFieldErrors | null {
  if (!isWorkspaceMember(workspace, assignedTo)) {
    return { assignedTo: "Assignee isn't in this workspace." };
  }
  if (!isSalesExecutiveMember(workspace, assignedTo)) {
    return {
      assignedTo: "Customers can only be assigned to sales executives.",
    };
  }
  return null;
}

function buildCustomerFields(
  workspaceId: string,
  actorId: string,
  data: CustomerInput,
  assignedTo: string | null,
) {
  return {
    workspace: workspaceId,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    company: data.company,
    jobTitle: data.jobTitle,
    website: data.website,
    address: { city: data.city, state: data.state, country: data.country },
    billingAddress: {
      line1: data.billingLine1,
      line2: data.billingLine2,
      city: data.billingCity,
      state: data.billingState,
      country: data.billingCountry,
      postalCode: data.billingPostalCode,
    },
    gstin: data.gstin,
    pan: data.pan,
    status: data.status,
    source: data.source,
    assignedTo,
    createdBy: actorId,
    tags: data.tags,
  };
}

/**
 * Creates a customer (optionally converting a lead when `fromLeadId` is set).
 * Handles role rules, activity log, lead conversion stamping, and assignment
 * notification — shared by the web actions and the mobile API.
 */
export async function createCustomerForActor(
  ctx: CustomerActorContext,
  data: CustomerInput,
  opts: { fromLeadId?: string } = {},
): Promise<CustomerServiceResult> {
  const { actorId, role, workspace } = ctx;
  const workspaceId = String(workspace._id);
  const converting = Boolean(opts.fromLeadId);

  if (converting) {
    if (!canConvertLeadToCustomer(role)) return { ok: false, code: "forbidden" };
  } else if (!canCreateCustomer(role)) {
    return { ok: false, code: "forbidden" };
  }

  let lead: Awaited<ReturnType<typeof Lead.findOne>> = null;
  if (converting) {
    lead = await Lead.findOne({
      _id: opts.fromLeadId,
      workspace: workspaceId,
    });
    if (!lead) return { ok: false, code: "lead_not_found" };
    if (lead.convertedAt) return { ok: false, code: "already_converted" };
  }

  const assignedTo = role === "sales_executive" ? actorId : data.assignedTo;

  if (assignedTo) {
    const assigneeErrors = validateAssignee(workspace, assignedTo);
    if (assigneeErrors) {
      return { ok: false, code: "validation", fieldErrors: assigneeErrors };
    }
  }

  const now = new Date();

  const notes = data.noteBody
    ? [{ body: data.noteBody, author: actorId, createdAt: now }]
    : [];

  const activity: CustomerActivityEvent[] = [
    makeCustomerEvent(
      "created",
      actorId,
      now,
      lead
        ? {
            status: data.status,
            fromLeadId: String(lead._id),
            fromLeadName: lead.name,
          }
        : { status: data.status },
    ),
  ];
  if (data.noteBody) {
    activity.push(
      makeCustomerEvent("note_added", actorId, now, { body: data.noteBody }),
    );
  }

  let customer: CustomerDoc;
  try {
    customer = await Customer.create({
      ...buildCustomerFields(workspaceId, actorId, data, assignedTo),
      ...(lead ? { convertedFromLead: lead._id } : {}),
      notes,
      activity,
    });
  } catch (err) {
    console.error("[customer-service] create failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't create the customer.";
    return { ok: false, code: "save_failed", message };
  }

  // Notify the assignee. Fired before the lead-stamping step that can
  // early-return, so a stamping failure never suppresses the notification
  // for a customer that was actually created. Best-effort; never throws.
  if (assignedTo) {
    await notifyAssignment({
      workspaceId,
      workspaceName: workspace.name,
      recipientId: assignedTo,
      actorId,
      type: "customer_assigned",
      entityType: "customer",
      entityId: String(customer._id),
      entityName: data.name,
      link: `/workspace/${workspaceId}/customers`,
    });
  }

  if (lead) {
    try {
      lead.convertedAt = now;
      lead.customerId = customer._id as unknown as typeof lead.customerId;
      lead.activity.push(
        makeLeadEvent("converted_to_customer", actorId, now, {
          customerId: String(customer._id),
          customerName: data.name,
        }) as unknown as (typeof lead.activity)[number],
      );
      await lead.save();
    } catch (err) {
      console.error("[customer-service] lead update failed", err);
      // Customer was created; flag the issue but don't roll back — the user
      // can re-edit the lead manually if conversion stamping failed.
      return { ok: false, code: "lead_stamp_failed" };
    }
  }

  return { ok: true, customer };
}

/**
 * Full update of a customer (the web edit form semantics): every
 * CustomerInput field is applied and every actual change emits an activity
 * event.
 */
export async function updateCustomerForActor(
  ctx: CustomerActorContext,
  customerId: string,
  data: CustomerInput,
): Promise<CustomerServiceResult> {
  const { actorId, role, workspace } = ctx;
  const workspaceId = String(workspace._id);

  if (!canViewCustomers(role)) return { ok: false, code: "forbidden" };

  const customer = await Customer.findOne({
    _id: customerId,
    workspace: workspaceId,
  });
  if (!customer) return { ok: false, code: "customer_not_found" };

  const currentAssignee = customer.assignedTo
    ? String(customer.assignedTo)
    : null;
  if (!canManageCustomer(role, actorId, currentAssignee)) {
    return { ok: false, code: "cannot_manage" };
  }

  const assignedTo =
    role === "sales_executive" ? currentAssignee : data.assignedTo;

  if (assignedTo) {
    const assigneeErrors = validateAssignee(workspace, assignedTo);
    if (assigneeErrors) {
      return { ok: false, code: "validation", fieldErrors: assigneeErrors };
    }
  }

  const now = new Date();

  const before = {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    company: customer.company ?? "",
    jobTitle: customer.jobTitle ?? "",
    website: customer.website ?? "",
    city: customer.address?.city ?? "",
    state: customer.address?.state ?? "",
    country: customer.address?.country ?? "",
    billingLine1: customer.billingAddress?.line1 ?? "",
    billingLine2: customer.billingAddress?.line2 ?? "",
    billingCity: customer.billingAddress?.city ?? "",
    billingState: customer.billingAddress?.state ?? "",
    billingCountry: customer.billingAddress?.country ?? "",
    billingPostalCode: customer.billingAddress?.postalCode ?? "",
    gstin: customer.gstin ?? "",
    pan: customer.pan ?? "",
    status: customer.status as CustomerStatus,
    source: customer.source as LeadSource,
    assignedTo: currentAssignee,
    tags: [...(customer.tags ?? [])],
  };

  customer.name = data.name;
  customer.email = data.email || null;
  customer.phone = data.phone || null;
  customer.company = data.company;
  customer.jobTitle = data.jobTitle;
  customer.website = data.website;
  customer.address = {
    city: data.city,
    state: data.state,
    country: data.country,
  };
  customer.billingAddress = {
    line1: data.billingLine1,
    line2: data.billingLine2,
    city: data.billingCity,
    state: data.billingState,
    country: data.billingCountry,
    postalCode: data.billingPostalCode,
  };
  customer.gstin = data.gstin;
  customer.pan = data.pan;
  customer.status = data.status;
  customer.source = data.source;
  customer.assignedTo = assignedTo
    ? (new mongoose.Types.ObjectId(assignedTo) as typeof customer.assignedTo)
    : null;
  customer.tags = data.tags;

  const events: CustomerActivityEvent[] = [];

  if (before.status !== data.status) {
    events.push(
      makeCustomerEvent("status_changed", actorId, now, {
        from: before.status,
        to: data.status,
      }),
    );
  }
  if (before.assignedTo !== assignedTo) {
    events.push(
      makeCustomerEvent("assignee_changed", actorId, now, {
        from: before.assignedTo,
        to: assignedTo,
      }),
    );
  }
  const beforeTagSet = new Set(before.tags);
  const afterTagSet = new Set(data.tags);
  const tagsAdded = data.tags.filter((t) => !beforeTagSet.has(t));
  const tagsRemoved = before.tags.filter((t) => !afterTagSet.has(t));
  if (tagsAdded.length || tagsRemoved.length) {
    events.push(
      makeCustomerEvent("tags_changed", actorId, now, {
        added: tagsAdded,
        removed: tagsRemoved,
      }),
    );
  }

  const detailDiffs: Array<{ key: string; old: unknown; next: unknown }> = [
    { key: "name", old: before.name, next: data.name },
    { key: "email", old: before.email, next: data.email },
    { key: "phone", old: before.phone, next: data.phone },
    { key: "company", old: before.company, next: data.company },
    { key: "jobTitle", old: before.jobTitle, next: data.jobTitle },
    { key: "website", old: before.website, next: data.website },
    { key: "source", old: before.source, next: data.source },
    { key: "city", old: before.city, next: data.city },
    { key: "state", old: before.state, next: data.state },
    { key: "country", old: before.country, next: data.country },
  ];
  const changedFields = detailDiffs
    .filter((d) => d.old !== d.next)
    .map((d) => d.key);
  if (changedFields.length) {
    events.push(
      makeCustomerEvent("details_updated", actorId, now, {
        fields: changedFields,
      }),
    );
  }

  const billingChanged =
    before.billingLine1 !== data.billingLine1 ||
    before.billingLine2 !== data.billingLine2 ||
    before.billingCity !== data.billingCity ||
    before.billingState !== data.billingState ||
    before.billingCountry !== data.billingCountry ||
    before.billingPostalCode !== data.billingPostalCode ||
    before.gstin !== data.gstin ||
    before.pan !== data.pan;
  if (billingChanged) {
    events.push(makeCustomerEvent("billing_updated", actorId, now));
  }

  if (data.noteBody) {
    customer.notes.push({
      body: data.noteBody,
      author: new mongoose.Types.ObjectId(
        actorId,
      ) as unknown as (typeof customer.notes)[number]["author"],
      createdAt: now,
    });
    events.push(
      makeCustomerEvent("note_added", actorId, now, { body: data.noteBody }),
    );
  }

  if (events.length) {
    customer.activity.push(
      ...(events as unknown as (typeof customer.activity)[number][]),
    );
  }

  try {
    await customer.save();
  } catch (err) {
    console.error("[customer-service] update failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't update the customer.";
    return { ok: false, code: "save_failed", message };
  }

  if (before.assignedTo !== assignedTo && assignedTo) {
    await notifyAssignment({
      workspaceId,
      workspaceName: workspace.name,
      recipientId: assignedTo,
      actorId,
      type: "customer_assigned",
      entityType: "customer",
      entityId: String(customer._id),
      entityName: data.name,
      link: `/workspace/${workspaceId}/customers`,
    });
  }

  return { ok: true, customer };
}

/**
 * Converts a persisted customer document into the raw record shape accepted
 * by parseCustomerInput — used by the mobile API for partial updates.
 */
export function customerToRawInput(customer: {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  website?: string | null;
  address?: { city?: string | null; state?: string | null; country?: string | null } | null;
  billingAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
  } | null;
  gstin?: string | null;
  pan?: string | null;
  status: string;
  source: string;
  assignedTo?: unknown;
  tags?: string[] | null;
}): Record<string, unknown> {
  return {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    company: customer.company ?? "",
    jobTitle: customer.jobTitle ?? "",
    website: customer.website ?? "",
    city: customer.address?.city ?? "",
    state: customer.address?.state ?? "",
    country: customer.address?.country ?? "",
    billingLine1: customer.billingAddress?.line1 ?? "",
    billingLine2: customer.billingAddress?.line2 ?? "",
    billingCity: customer.billingAddress?.city ?? "",
    billingState: customer.billingAddress?.state ?? "",
    billingCountry: customer.billingAddress?.country ?? "",
    billingPostalCode: customer.billingAddress?.postalCode ?? "",
    gstin: customer.gstin ?? "",
    pan: customer.pan ?? "",
    status: customer.status,
    source: customer.source,
    assignedTo: customer.assignedTo ? String(customer.assignedTo) : "",
    tags: customer.tags ?? [],
    noteBody: "",
  };
}
