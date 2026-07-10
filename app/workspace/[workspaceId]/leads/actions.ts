"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Lead, {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadActivityType,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/models/lead";
import Workspace from "@/models/workspace";
import { maybeTriggerLeadCall } from "@/lib/lead-call";
import {
  canManageLead,
  canViewLeads,
} from "@/lib/lead";
import { runLeadNoteAssistant, type LeadNoteInput } from "@/lib/lead-note-ai";
import { notifyAssignment } from "@/lib/notify-assignment";
import { getActorRole } from "@/lib/workspace-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ActivityEvent = {
  type: LeadActivityType;
  actor: mongoose.Types.ObjectId;
  at: Date;
  data: Record<string, unknown>;
};

function makeEvent(
  type: LeadActivityType,
  actorId: string,
  at: Date,
  data: Record<string, unknown> = {},
): ActivityEvent {
  return {
    type,
    actor: new mongoose.Types.ObjectId(actorId),
    at,
    data,
  };
}

export type LeadFormErrors = Partial<
  Record<
    | "name"
    | "email"
    | "phone"
    | "company"
    | "stage"
    | "source"
    | "priority"
    | "estimatedValue"
    | "nextFollowUpAt"
    | "assignedTo"
    | "noteBody",
    string
  >
>;

export type LeadActionState =
  | {
      ok?: boolean;
      errors?: LeadFormErrors;
      formError?: string;
    }
  | undefined;

function isStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}
function isSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value);
}
function isPriority(value: string): value is LeadPriority {
  return (LEAD_PRIORITIES as readonly string[]).includes(value);
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

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  // The follow-up is a date-only value. Canonicalize a `yyyy-MM-dd` calendar
  // date to UTC midnight so it stores/compares/formats the same calendar day
  // regardless of the runtime timezone (Vercel runs in UTC).
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  const d = dateOnly ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

type ParsedLeadInput = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  city: string;
  state: string;
  country: string;
  stage: LeadStage;
  source: LeadSource;
  priority: LeadPriority;
  estimatedValue: number;
  assignedTo: string | null;
  tags: string[];
  nextFollowUpAt: Date | null;
  lostReason: string;
  noteBody: string;
};

function parseLeadForm(formData: FormData): {
  data?: ParsedLeadInput;
  errors?: LeadFormErrors;
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
  const stageInput = String(formData.get("stage") ?? "");
  const sourceInput = String(formData.get("source") ?? "");
  const priorityInput = String(formData.get("priority") ?? "");
  const estimatedValueRaw = String(formData.get("estimatedValue") ?? "").trim();
  const assignedTo = String(formData.get("assignedTo") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const followUpRaw = String(formData.get("nextFollowUpAt") ?? "").trim();
  const lostReason = String(formData.get("lostReason") ?? "").trim();
  const noteBody = String(formData.get("noteBody") ?? "").trim();

  const errors: LeadFormErrors = {};
  if (name.length < 2) errors.name = "Please enter a name.";
  if (email && !EMAIL_RE.test(email))
    errors.email = "Please enter a valid email.";
  if (!isStage(stageInput)) errors.stage = "Pick a stage.";
  if (!isSource(sourceInput)) errors.source = "Pick a source.";
  if (!isPriority(priorityInput)) errors.priority = "Pick a priority.";

  let estimatedValue = 0;
  if (estimatedValueRaw.length > 0) {
    const n = Number(estimatedValueRaw);
    if (!Number.isFinite(n) || n < 0)
      errors.estimatedValue = "Estimated value must be 0 or more.";
    else estimatedValue = n;
  }

  let nextFollowUpAt: Date | null = null;
  if (followUpRaw.length > 0) {
    const d = parseDateInput(followUpRaw);
    if (!d) errors.nextFollowUpAt = "Please pick a valid date.";
    else nextFollowUpAt = d;
  }

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
      stage: stageInput as LeadStage,
      source: sourceInput as LeadSource,
      priority: priorityInput as LeadPriority,
      estimatedValue,
      assignedTo: assignedToId,
      tags: parseTags(tagsRaw),
      nextFollowUpAt,
      lostReason,
      noteBody,
    },
  };
}

export async function createLead(
  workspaceId: string,
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }

  const parsed = parseLeadForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canViewLeads(actorRole)) {
    return { formError: "You don't have permission to add leads." };
  }

  // Sales executives can't manage the assignee — leads they create are
  // always assigned to themselves regardless of what the form submits.
  if (actorRole === "sales_executive") {
    data.assignedTo = session.user.id;
  }

  if (data.assignedTo) {
    if (!isWorkspaceMember(workspace, data.assignedTo)) {
      return { errors: { assignedTo: "Assignee isn't in this workspace." } };
    }
    if (!isSalesExecutiveMember(workspace, data.assignedTo)) {
      return {
        errors: { assignedTo: "Leads can only be assigned to sales executives." },
      };
    }
  }

  const now = new Date();
  const wonAt = data.stage === "won" ? now : null;
  const lostAt = data.stage === "lost" ? now : null;

  const notes = data.noteBody
    ? [{ body: data.noteBody, author: session.user.id, createdAt: now }]
    : [];

  const activity: ActivityEvent[] = [
    makeEvent("created", session.user.id, now, { stage: data.stage }),
  ];
  if (data.noteBody) {
    activity.push(
      makeEvent("note_added", session.user.id, now, { body: data.noteBody }),
    );
  }

  let lead;
  try {
    lead = await Lead.create({
      workspace: workspaceId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company,
      jobTitle: data.jobTitle,
      website: data.website,
      address: { city: data.city, state: data.state, country: data.country },
      stage: data.stage,
      source: data.source,
      priority: data.priority,
      estimatedValue: data.estimatedValue,
      assignedTo: data.assignedTo,
      createdBy: session.user.id,
      tags: data.tags,
      notes,
      activity,
      nextFollowUpAt: data.nextFollowUpAt,
      lastContactedAt: null,
      wonAt,
      lostAt,
      lostReason: data.stage === "lost" ? data.lostReason : "",
    });
  } catch (err) {
    console.error("[createLead] failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't create the lead.";
    return { formError: `${message} Please try again.` };
  }

  // Fire the AI voice-agent call if the workspace has it enabled (non-fatal).
  await maybeTriggerLeadCall(lead, {});

  // Notify the assignee (in-app + email). Best-effort — self-guards & never throws.
  if (data.assignedTo) {
    await notifyAssignment({
      workspaceId,
      workspaceName: workspace.name,
      recipientId: data.assignedTo,
      actorId: session.user.id,
      type: "lead_assigned",
      entityType: "lead",
      entityId: String(lead._id),
      entityName: data.name,
      link: `/workspace/${workspaceId}/leads`,
    });
  }

  revalidatePath(`/workspace/${workspaceId}/leads`);
  return { ok: true };
}

export async function updateLead(
  workspaceId: string,
  leadId: string,
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
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

  const parsed = parseLeadForm(formData);
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canViewLeads(actorRole)) {
    return { formError: "You don't have permission to edit leads." };
  }

  const lead = await Lead.findOne({ _id: leadId, workspace: workspaceId });
  if (!lead) return { formError: "Lead not found." };

  const currentAssignee = lead.assignedTo ? String(lead.assignedTo) : null;
  if (!canManageLead(actorRole, session.user.id, currentAssignee)) {
    return { formError: "You can't edit this lead." };
  }

  // Sales executives can't change the assignee — preserve whatever the lead
  // already has, no matter what the form sent.
  if (actorRole === "sales_executive") {
    data.assignedTo = currentAssignee;
  }

  if (data.assignedTo) {
    if (!isWorkspaceMember(workspace, data.assignedTo)) {
      return { errors: { assignedTo: "Assignee isn't in this workspace." } };
    }
    if (!isSalesExecutiveMember(workspace, data.assignedTo)) {
      return {
        errors: { assignedTo: "Leads can only be assigned to sales executives." },
      };
    }
  }

  const now = new Date();

  // Snapshot the pre-mutation state so we can diff and emit activity events.
  const before = {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    website: lead.website ?? "",
    city: lead.address?.city ?? "",
    state: lead.address?.state ?? "",
    country: lead.address?.country ?? "",
    stage: lead.stage as LeadStage,
    source: lead.source as LeadSource,
    priority: lead.priority as LeadPriority,
    estimatedValue: lead.estimatedValue ?? 0,
    assignedTo: currentAssignee,
    tags: [...(lead.tags ?? [])],
    nextFollowUpAt: lead.nextFollowUpAt
      ? new Date(lead.nextFollowUpAt).toISOString()
      : null,
    lostReason: lead.lostReason ?? "",
  };

  const stageChanged = before.stage !== data.stage;

  lead.name = data.name;
  lead.email = data.email || null;
  lead.phone = data.phone || null;
  lead.company = data.company;
  lead.jobTitle = data.jobTitle;
  lead.website = data.website;
  lead.address = {
    city: data.city,
    state: data.state,
    country: data.country,
  };
  lead.stage = data.stage;
  lead.source = data.source;
  lead.priority = data.priority;
  lead.estimatedValue = data.estimatedValue;
  lead.assignedTo = data.assignedTo
    ? (new mongoose.Types.ObjectId(data.assignedTo) as typeof lead.assignedTo)
    : null;
  lead.tags = data.tags;
  lead.nextFollowUpAt = data.nextFollowUpAt;
  lead.lostReason = data.stage === "lost" ? data.lostReason : "";

  if (stageChanged) {
    if (data.stage === "won") lead.wonAt = now;
    if (data.stage === "lost") lead.lostAt = now;
    if (data.stage !== "won") lead.wonAt = null;
    if (data.stage !== "lost") lead.lostAt = null;
  }

  // Build the activity events for everything that actually changed.
  const events: ActivityEvent[] = [];
  if (stageChanged) {
    events.push(
      makeEvent("stage_changed", session.user.id, now, {
        from: before.stage,
        to: data.stage,
      }),
    );
  }
  if (before.priority !== data.priority) {
    events.push(
      makeEvent("priority_changed", session.user.id, now, {
        from: before.priority,
        to: data.priority,
      }),
    );
  }
  if (before.assignedTo !== data.assignedTo) {
    events.push(
      makeEvent("assignee_changed", session.user.id, now, {
        from: before.assignedTo,
        to: data.assignedTo,
      }),
    );
  }
  const newFollowUpIso = data.nextFollowUpAt
    ? data.nextFollowUpAt.toISOString()
    : null;
  if (before.nextFollowUpAt !== newFollowUpIso) {
    events.push(
      makeEvent("follow_up_changed", session.user.id, now, {
        from: before.nextFollowUpAt,
        to: newFollowUpIso,
      }),
    );
  }
  const beforeTagSet = new Set(before.tags);
  const afterTagSet = new Set(data.tags);
  const tagsAdded = data.tags.filter((t) => !beforeTagSet.has(t));
  const tagsRemoved = before.tags.filter((t) => !afterTagSet.has(t));
  if (tagsAdded.length || tagsRemoved.length) {
    events.push(
      makeEvent("tags_changed", session.user.id, now, {
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
    { key: "estimatedValue", old: before.estimatedValue, next: data.estimatedValue },
    { key: "city", old: before.city, next: data.city },
    { key: "state", old: before.state, next: data.state },
    { key: "country", old: before.country, next: data.country },
    {
      key: "lostReason",
      old: before.lostReason,
      next: data.stage === "lost" ? data.lostReason : "",
    },
  ];
  const changedFields = detailDiffs
    .filter((d) => d.old !== d.next)
    .map((d) => d.key);
  if (changedFields.length) {
    events.push(
      makeEvent("details_updated", session.user.id, now, {
        fields: changedFields,
      }),
    );
  }

  if (data.noteBody) {
    lead.notes.push({
      body: data.noteBody,
      author: new mongoose.Types.ObjectId(
        session.user.id,
      ) as unknown as (typeof lead.notes)[number]["author"],
      createdAt: now,
    });
    lead.lastContactedAt = now;
    events.push(
      makeEvent("note_added", session.user.id, now, { body: data.noteBody }),
    );
  }

  if (events.length) {
    lead.activity.push(
      ...(events as unknown as (typeof lead.activity)[number][]),
    );
  }

  try {
    await lead.save();
  } catch (err) {
    console.error("[updateLead] failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't update the lead.";
    return { formError: `${message} Please try again.` };
  }

  // Notify the new assignee when the lead was (re)assigned to someone.
  if (before.assignedTo !== data.assignedTo && data.assignedTo) {
    await notifyAssignment({
      workspaceId,
      workspaceName: workspace.name,
      recipientId: data.assignedTo,
      actorId: session.user.id,
      type: "lead_assigned",
      entityType: "lead",
      entityId: String(lead._id),
      entityName: data.name,
      link: `/workspace/${workspaceId}/leads`,
    });
  }

  revalidatePath(`/workspace/${workspaceId}/leads`);
  return { ok: true };
}

const AI_NOTE_SEED_MAX = 4000;
const AI_NOTE_HISTORY_MAX = 20;
const AI_NOTE_HISTORY_LINE_MAX = 1000;

/**
 * Draft a first-touch note for a lead with Claude, from the fields the rep has
 * entered so far plus any rough text already in the note box. This does not
 * persist anything — it only returns text for the client to drop into the
 * textarea, where the rep can edit it before saving the lead.
 */
export async function generateLeadNote(
  workspaceId: string,
  input: LeadNoteInput,
): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, error: "Invalid workspace." };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canViewLeads(actorRole)) {
    return { ok: false, error: "You don't have permission to add leads." };
  }

  const cleaned: LeadNoteInput = {
    name: input.name?.trim(),
    company: input.company?.trim(),
    email: input.email?.trim(),
    phone: input.phone?.trim(),
    stage: input.stage?.trim(),
    source: input.source?.trim(),
    priority: input.priority?.trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : [],
    existingNotes: Array.isArray(input.existingNotes)
      ? input.existingNotes
          .map((n) => String(n).trim().slice(0, AI_NOTE_HISTORY_LINE_MAX))
          .filter(Boolean)
          .slice(-AI_NOTE_HISTORY_MAX)
      : [],
    seed: input.seed?.slice(0, AI_NOTE_SEED_MAX),
  };

  try {
    const note = await runLeadNoteAssistant(cleaned, workspace.name);
    if (!note) {
      return { ok: false, error: "Couldn't generate a note. Try again." };
    }
    return { ok: true, note };
  } catch (err) {
    console.error("[generateLeadNote] AI call failed", err);
    return {
      ok: false,
      error:
        err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
          ? "Claude API key is not configured."
          : "Couldn't generate a note. Try again.",
    };
  }
}

