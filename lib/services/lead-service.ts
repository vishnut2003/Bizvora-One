import "server-only";
import mongoose from "mongoose";
import Lead, {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadActivityType,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/models/lead";
import { canManageLead, canViewLeads } from "@/lib/lead";
import { maybeTriggerLeadCall } from "@/lib/lead-call";
import { notifyAssignment } from "@/lib/notify-assignment";
import type { UserRole } from "@/lib/user";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal structural view of a workspace document — satisfied by both
// hydrated docs (server actions) and .lean() results (mobile routes).
export type WorkspaceLike = {
  _id: unknown;
  name: string;
  owner: unknown;
  members?: ReadonlyArray<{ user: unknown; role: string }>;
};

export type LeadActorContext = {
  actorId: string;
  role: UserRole;
  workspace: WorkspaceLike;
};

export type LeadFieldErrors = Partial<
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

export type LeadInput = {
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

type LeadDoc = NonNullable<Awaited<ReturnType<typeof Lead.findOne>>>;

export type LeadServiceResult =
  | { ok: true; lead: LeadDoc }
  | { ok: false; code: "forbidden" | "lead_not_found" | "cannot_manage" }
  | { ok: false; code: "validation"; fieldErrors: LeadFieldErrors }
  | { ok: false; code: "save_failed"; message: string };

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

function isStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}
function isSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value);
}
function isPriority(value: string): value is LeadPriority {
  return (LEAD_PRIORITIES as readonly string[]).includes(value);
}

export function parseTags(input: unknown): string[] {
  const parts = Array.isArray(input)
    ? input.map((t) => String(t))
    : String(input ?? "").split(",");
  return Array.from(
    new Set(
      parts
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  ).slice(0, 20);
}

export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  // The follow-up is a date-only value. Canonicalize a `yyyy-MM-dd` calendar
  // date to UTC midnight so it stores/compares/formats the same calendar day
  // regardless of the runtime timezone (Vercel runs in UTC).
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  const d = dateOnly ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isWorkspaceMember(
  workspace: WorkspaceLike,
  userId: string,
): boolean {
  if (String(workspace.owner) === userId) return true;
  return workspace.members?.some((m) => String(m.user) === userId) ?? false;
}

export function isSalesExecutiveMember(
  workspace: Pick<WorkspaceLike, "members">,
  userId: string,
): boolean {
  return (
    workspace.members?.some(
      (m) => String(m.user) === userId && m.role === "sales_executive",
    ) ?? false
  );
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

/**
 * Validates raw lead field values (from FormData converted to a record, or a
 * mobile JSON body) into a typed LeadInput. Single source of the lead
 * validation rules — shared by the web server action and the mobile API.
 */
export function parseLeadInput(raw: Record<string, unknown>): {
  data?: LeadInput;
  errors?: LeadFieldErrors;
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
  const stageInput = asString(raw.stage);
  const sourceInput = asString(raw.source);
  const priorityInput = asString(raw.priority);
  const estimatedValueRaw = asString(raw.estimatedValue).trim();
  const assignedTo = asString(raw.assignedTo).trim();
  const followUpRaw = asString(raw.nextFollowUpAt).trim();
  const lostReason = asString(raw.lostReason).trim();
  const noteBody = asString(raw.noteBody).trim();

  const errors: LeadFieldErrors = {};
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
      tags: parseTags(raw.tags),
      nextFollowUpAt,
      lostReason,
      noteBody,
    },
  };
}

function validateAssignee(
  workspace: WorkspaceLike,
  assignedTo: string,
): LeadFieldErrors | null {
  if (!isWorkspaceMember(workspace, assignedTo)) {
    return { assignedTo: "Assignee isn't in this workspace." };
  }
  if (!isSalesExecutiveMember(workspace, assignedTo)) {
    return { assignedTo: "Leads can only be assigned to sales executives." };
  }
  return null;
}

/**
 * Creates a lead on behalf of an actor whose workspace membership has already
 * been verified. Handles role rules, activity log, AI call trigger, and
 * assignment notification — shared by the web action and the mobile API.
 */
export async function createLeadForActor(
  ctx: LeadActorContext,
  data: LeadInput,
): Promise<LeadServiceResult> {
  const { actorId, role, workspace } = ctx;
  const workspaceId = String(workspace._id);

  if (!canViewLeads(role)) return { ok: false, code: "forbidden" };

  // Sales executives can't manage the assignee — leads they create are
  // always assigned to themselves regardless of what was submitted.
  const assignedTo = role === "sales_executive" ? actorId : data.assignedTo;

  if (assignedTo) {
    const assigneeErrors = validateAssignee(workspace, assignedTo);
    if (assigneeErrors) {
      return { ok: false, code: "validation", fieldErrors: assigneeErrors };
    }
  }

  const now = new Date();
  const wonAt = data.stage === "won" ? now : null;
  const lostAt = data.stage === "lost" ? now : null;

  const notes = data.noteBody
    ? [{ body: data.noteBody, author: actorId, createdAt: now }]
    : [];

  const activity: ActivityEvent[] = [
    makeEvent("created", actorId, now, { stage: data.stage }),
  ];
  if (data.noteBody) {
    activity.push(makeEvent("note_added", actorId, now, { body: data.noteBody }));
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
      assignedTo,
      createdBy: actorId,
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
    console.error("[lead-service] create failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't create the lead.";
    return { ok: false, code: "save_failed", message };
  }

  // Fire the AI voice-agent call if the workspace has it enabled (non-fatal).
  await maybeTriggerLeadCall(lead, {});

  // Notify the assignee (in-app + email). Best-effort — self-guards & never throws.
  if (assignedTo) {
    await notifyAssignment({
      workspaceId,
      workspaceName: workspace.name,
      recipientId: assignedTo,
      actorId,
      type: "lead_assigned",
      entityType: "lead",
      entityId: String(lead._id),
      entityName: data.name,
      link: `/workspace/${workspaceId}/leads`,
    });
  }

  return { ok: true, lead };
}

/**
 * Full update of a lead (the web edit form semantics): every LeadInput field
 * is applied, stage transitions stamp wonAt/lostAt, and every actual change
 * emits an activity event.
 */
export async function updateLeadForActor(
  ctx: LeadActorContext,
  leadId: string,
  data: LeadInput,
): Promise<LeadServiceResult> {
  const { actorId, role, workspace } = ctx;
  const workspaceId = String(workspace._id);

  if (!canViewLeads(role)) return { ok: false, code: "forbidden" };

  const lead = await Lead.findOne({ _id: leadId, workspace: workspaceId });
  if (!lead) return { ok: false, code: "lead_not_found" };

  const currentAssignee = lead.assignedTo ? String(lead.assignedTo) : null;
  if (!canManageLead(role, actorId, currentAssignee)) {
    return { ok: false, code: "cannot_manage" };
  }

  // Sales executives can't change the assignee — preserve whatever the lead
  // already has, no matter what was submitted.
  const assignedTo =
    role === "sales_executive" ? currentAssignee : data.assignedTo;

  if (assignedTo) {
    const assigneeErrors = validateAssignee(workspace, assignedTo);
    if (assigneeErrors) {
      return { ok: false, code: "validation", fieldErrors: assigneeErrors };
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
  lead.assignedTo = assignedTo
    ? (new mongoose.Types.ObjectId(assignedTo) as typeof lead.assignedTo)
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
      makeEvent("stage_changed", actorId, now, {
        from: before.stage,
        to: data.stage,
      }),
    );
  }
  if (before.priority !== data.priority) {
    events.push(
      makeEvent("priority_changed", actorId, now, {
        from: before.priority,
        to: data.priority,
      }),
    );
  }
  if (before.assignedTo !== assignedTo) {
    events.push(
      makeEvent("assignee_changed", actorId, now, {
        from: before.assignedTo,
        to: assignedTo,
      }),
    );
  }
  const newFollowUpIso = data.nextFollowUpAt
    ? data.nextFollowUpAt.toISOString()
    : null;
  if (before.nextFollowUpAt !== newFollowUpIso) {
    events.push(
      makeEvent("follow_up_changed", actorId, now, {
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
      makeEvent("tags_changed", actorId, now, {
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
      makeEvent("details_updated", actorId, now, { fields: changedFields }),
    );
  }

  if (data.noteBody) {
    lead.notes.push({
      body: data.noteBody,
      author: new mongoose.Types.ObjectId(
        actorId,
      ) as unknown as (typeof lead.notes)[number]["author"],
      createdAt: now,
    });
    lead.lastContactedAt = now;
    events.push(makeEvent("note_added", actorId, now, { body: data.noteBody }));
  }

  if (events.length) {
    lead.activity.push(
      ...(events as unknown as (typeof lead.activity)[number][]),
    );
  }

  try {
    await lead.save();
  } catch (err) {
    console.error("[lead-service] update failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't update the lead.";
    return { ok: false, code: "save_failed", message };
  }

  // Notify the new assignee when the lead was (re)assigned to someone.
  if (before.assignedTo !== assignedTo && assignedTo) {
    await notifyAssignment({
      workspaceId,
      workspaceName: workspace.name,
      recipientId: assignedTo,
      actorId,
      type: "lead_assigned",
      entityType: "lead",
      entityId: String(lead._id),
      entityName: data.name,
      link: `/workspace/${workspaceId}/leads`,
    });
  }

  return { ok: true, lead };
}

/**
 * Converts a persisted lead document back into the raw record shape accepted
 * by parseLeadInput. Used by the mobile API to implement partial updates:
 * merge the request body over these values, then run the full update path.
 */
export function leadToRawInput(lead: {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  website?: string | null;
  address?: { city?: string | null; state?: string | null; country?: string | null } | null;
  stage: string;
  source: string;
  priority: string;
  estimatedValue?: number | null;
  assignedTo?: unknown;
  tags?: string[] | null;
  nextFollowUpAt?: Date | null;
  lostReason?: string | null;
}): Record<string, unknown> {
  return {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    website: lead.website ?? "",
    city: lead.address?.city ?? "",
    state: lead.address?.state ?? "",
    country: lead.address?.country ?? "",
    stage: lead.stage,
    source: lead.source,
    priority: lead.priority,
    estimatedValue: lead.estimatedValue ?? 0,
    assignedTo: lead.assignedTo ? String(lead.assignedTo) : "",
    tags: lead.tags ?? [],
    nextFollowUpAt: lead.nextFollowUpAt
      ? new Date(lead.nextFollowUpAt).toISOString()
      : "",
    lostReason: lead.lostReason ?? "",
    noteBody: "",
  };
}
