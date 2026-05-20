"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
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
import Workspace from "@/models/workspace";
import {
  canConvertLeadToCustomer,
  canCreateCustomer,
  canManageAnyCustomer,
  canManageCustomer,
  canViewCustomers,
} from "@/lib/customer";
import { getActorRole } from "@/lib/workspace-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9A-Z]{15}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

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

type LeadActivityEvent = {
  type: LeadActivityType;
  actor: mongoose.Types.ObjectId;
  at: Date;
  data: Record<string, unknown>;
};

function makeLeadEvent(
  type: LeadActivityType,
  actorId: string,
  at: Date,
  data: Record<string, unknown> = {},
): LeadActivityEvent {
  return {
    type,
    actor: new mongoose.Types.ObjectId(actorId),
    at,
    data,
  };
}

export type CustomerFormErrors = Partial<
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

export type CustomerActionState =
  | {
      ok?: boolean;
      errors?: CustomerFormErrors;
      formError?: string;
    }
  | undefined;

function isStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}
function isSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value);
}

function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  ).slice(0, 20);
}

type WorkspaceMemberLike = { user: unknown; role: string };

function isWorkspaceMember(
  workspace: { owner: unknown; members?: ReadonlyArray<WorkspaceMemberLike> },
  userId: string,
): boolean {
  if (String(workspace.owner) === userId) return true;
  return (
    workspace.members?.some((m) => String(m.user) === userId) ?? false
  );
}

function isSalesExecutiveMember(
  workspace: { members?: ReadonlyArray<WorkspaceMemberLike> },
  userId: string,
): boolean {
  return (
    workspace.members?.some(
      (m) => String(m.user) === userId && m.role === "sales_executive",
    ) ?? false
  );
}

type ParsedCustomerInput = {
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

function parseCustomerForm(formData: FormData): {
  data?: ParsedCustomerInput;
  errors?: CustomerFormErrors;
} {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const billingLine1 = String(formData.get("billingLine1") ?? "").trim();
  const billingLine2 = String(formData.get("billingLine2") ?? "").trim();
  const billingCity = String(formData.get("billingCity") ?? "").trim();
  const billingState = String(formData.get("billingState") ?? "").trim();
  const billingCountry = String(formData.get("billingCountry") ?? "").trim();
  const billingPostalCode = String(
    formData.get("billingPostalCode") ?? "",
  ).trim();
  const gstin = String(formData.get("gstin") ?? "")
    .trim()
    .toUpperCase();
  const pan = String(formData.get("pan") ?? "")
    .trim()
    .toUpperCase();
  const statusInput = String(formData.get("status") ?? "");
  const sourceInput = String(formData.get("source") ?? "");
  const assignedTo = String(formData.get("assignedTo") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const noteBody = String(formData.get("noteBody") ?? "").trim();

  const errors: CustomerFormErrors = {};
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
      tags: parseTags(tagsRaw),
      noteBody,
    },
  };
}

export async function createCustomer(
  workspaceId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }

  const parsed = parseCustomerForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canCreateCustomer(actorRole)) {
    return { formError: "You don't have permission to add customers." };
  }

  if (actorRole === "sales_executive") {
    data.assignedTo = session.user.id;
  }

  if (data.assignedTo) {
    if (!isWorkspaceMember(workspace, data.assignedTo)) {
      return { errors: { assignedTo: "Assignee isn't in this workspace." } };
    }
    if (!isSalesExecutiveMember(workspace, data.assignedTo)) {
      return {
        errors: {
          assignedTo: "Customers can only be assigned to sales executives.",
        },
      };
    }
  }

  const now = new Date();

  const notes = data.noteBody
    ? [{ body: data.noteBody, author: session.user.id, createdAt: now }]
    : [];

  const activity: CustomerActivityEvent[] = [
    makeCustomerEvent("created", session.user.id, now, { status: data.status }),
  ];
  if (data.noteBody) {
    activity.push(
      makeCustomerEvent("note_added", session.user.id, now, {
        body: data.noteBody,
      }),
    );
  }

  try {
    await Customer.create({
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
      assignedTo: data.assignedTo,
      createdBy: session.user.id,
      tags: data.tags,
      notes,
      activity,
    });
  } catch (err) {
    console.error("[createCustomer] failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't create the customer.";
    return { formError: `${message} Please try again.` };
  }

  revalidatePath(`/workspace/${workspaceId}/customers`);
  return { ok: true };
}

export async function createCustomerFromLead(
  workspaceId: string,
  leadId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(leadId)
  ) {
    return { formError: "Invalid identifier." };
  }

  const parsed = parseCustomerForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canConvertLeadToCustomer(actorRole)) {
    return { formError: "You don't have permission to convert leads." };
  }

  const lead = await Lead.findOne({ _id: leadId, workspace: workspaceId });
  if (!lead) return { formError: "Lead not found." };
  if (lead.convertedAt) {
    return {
      formError: "This lead has already been converted to a customer.",
    };
  }

  if (actorRole === "sales_executive") {
    data.assignedTo = session.user.id;
  }

  if (data.assignedTo) {
    if (!isWorkspaceMember(workspace, data.assignedTo)) {
      return { errors: { assignedTo: "Assignee isn't in this workspace." } };
    }
    if (!isSalesExecutiveMember(workspace, data.assignedTo)) {
      return {
        errors: {
          assignedTo: "Customers can only be assigned to sales executives.",
        },
      };
    }
  }

  const now = new Date();

  const notes = data.noteBody
    ? [{ body: data.noteBody, author: session.user.id, createdAt: now }]
    : [];

  const activity: CustomerActivityEvent[] = [
    makeCustomerEvent("created", session.user.id, now, {
      status: data.status,
      fromLeadId: String(lead._id),
      fromLeadName: lead.name,
    }),
  ];
  if (data.noteBody) {
    activity.push(
      makeCustomerEvent("note_added", session.user.id, now, {
        body: data.noteBody,
      }),
    );
  }

  let customerId: mongoose.Types.ObjectId;
  try {
    const customer = await Customer.create({
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
      assignedTo: data.assignedTo,
      createdBy: session.user.id,
      convertedFromLead: lead._id,
      tags: data.tags,
      notes,
      activity,
    });
    customerId = customer._id as mongoose.Types.ObjectId;
  } catch (err) {
    console.error("[createCustomerFromLead] customer create failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't create the customer.";
    return { formError: `${message} Please try again.` };
  }

  try {
    lead.convertedAt = now;
    lead.customerId = customerId as unknown as typeof lead.customerId;
    lead.activity.push(
      makeLeadEvent("converted_to_customer", session.user.id, now, {
        customerId: String(customerId),
        customerName: data.name,
      }) as unknown as (typeof lead.activity)[number],
    );
    await lead.save();
  } catch (err) {
    console.error("[createCustomerFromLead] lead update failed", err);
    // Customer was created; flag the issue but don't roll back — the user can
    // re-edit the lead manually if conversion stamping failed.
    return {
      formError:
        "Customer was created, but we couldn't update the originating lead. Please refresh.",
    };
  }

  revalidatePath(`/workspace/${workspaceId}/customers`);
  revalidatePath(`/workspace/${workspaceId}/leads`);
  return { ok: true };
}

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(customerId)
  ) {
    return { formError: "Invalid identifier." };
  }

  const parsed = parseCustomerForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canViewCustomers(actorRole)) {
    return { formError: "You don't have permission to edit customers." };
  }

  const customer = await Customer.findOne({
    _id: customerId,
    workspace: workspaceId,
  });
  if (!customer) return { formError: "Customer not found." };

  const currentAssignee = customer.assignedTo
    ? String(customer.assignedTo)
    : null;
  if (!canManageCustomer(actorRole, session.user.id, currentAssignee)) {
    return { formError: "You can't edit this customer." };
  }

  if (actorRole === "sales_executive") {
    data.assignedTo = currentAssignee;
  }

  if (data.assignedTo) {
    if (!isWorkspaceMember(workspace, data.assignedTo)) {
      return { errors: { assignedTo: "Assignee isn't in this workspace." } };
    }
    if (!isSalesExecutiveMember(workspace, data.assignedTo)) {
      return {
        errors: {
          assignedTo: "Customers can only be assigned to sales executives.",
        },
      };
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
  customer.assignedTo = data.assignedTo
    ? (new mongoose.Types.ObjectId(
        data.assignedTo,
      ) as typeof customer.assignedTo)
    : null;
  customer.tags = data.tags;

  const events: CustomerActivityEvent[] = [];

  if (before.status !== data.status) {
    events.push(
      makeCustomerEvent("status_changed", session.user.id, now, {
        from: before.status,
        to: data.status,
      }),
    );
  }
  if (before.assignedTo !== data.assignedTo) {
    events.push(
      makeCustomerEvent("assignee_changed", session.user.id, now, {
        from: before.assignedTo,
        to: data.assignedTo,
      }),
    );
  }
  const beforeTagSet = new Set(before.tags);
  const afterTagSet = new Set(data.tags);
  const tagsAdded = data.tags.filter((t) => !beforeTagSet.has(t));
  const tagsRemoved = before.tags.filter((t) => !afterTagSet.has(t));
  if (tagsAdded.length || tagsRemoved.length) {
    events.push(
      makeCustomerEvent("tags_changed", session.user.id, now, {
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
      makeCustomerEvent("details_updated", session.user.id, now, {
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
    events.push(makeCustomerEvent("billing_updated", session.user.id, now));
  }

  if (data.noteBody) {
    customer.notes.push({
      body: data.noteBody,
      author: new mongoose.Types.ObjectId(
        session.user.id,
      ) as unknown as (typeof customer.notes)[number]["author"],
      createdAt: now,
    });
    events.push(
      makeCustomerEvent("note_added", session.user.id, now, {
        body: data.noteBody,
      }),
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
    console.error("[updateCustomer] failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't update the customer.";
    return { formError: `${message} Please try again.` };
  }

  revalidatePath(`/workspace/${workspaceId}/customers`);
  return { ok: true };
}

export type RemoveCustomerState =
  | { ok?: boolean; formError?: string }
  | undefined;

export async function removeCustomer(
  workspaceId: string,
  customerId: string,
): Promise<RemoveCustomerState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(customerId)
  ) {
    return { formError: "Invalid identifier." };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageAnyCustomer(actorRole)) {
    return { formError: "You don't have permission to delete customers." };
  }

  const result = await Customer.deleteOne({
    _id: customerId,
    workspace: workspaceId,
  });
  if (result.deletedCount === 0) {
    return { formError: "Customer not found." };
  }

  revalidatePath(`/workspace/${workspaceId}/customers`);
  return { ok: true };
}
