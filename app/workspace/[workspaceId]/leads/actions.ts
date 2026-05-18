"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Lead, {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/models/lead";
import Workspace from "@/models/workspace";
import {
  canManageAnyLead,
  canManageLead,
  canViewLeads,
} from "@/lib/lead";
import { getActorRole } from "@/lib/workspace-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const d = new Date(value);
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

  try {
    await Lead.create({
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
      stageHistory: [
        {
          stage: data.stage,
          changedBy: session.user.id,
          changedAt: now,
          note: "Lead created",
        },
      ],
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
  const stageChanged = lead.stage !== data.stage;

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
    lead.stageHistory.push({
      stage: data.stage,
      changedBy: new mongoose.Types.ObjectId(
        session.user.id,
      ) as unknown as (typeof lead.stageHistory)[number]["changedBy"],
      changedAt: now,
      note: "",
    });
    if (data.stage === "won") lead.wonAt = now;
    if (data.stage === "lost") lead.lostAt = now;
    if (data.stage !== "won") lead.wonAt = null;
    if (data.stage !== "lost") lead.lostAt = null;
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
  }

  try {
    await lead.save();
  } catch (err) {
    console.error("[updateLead] failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't update the lead.";
    return { formError: `${message} Please try again.` };
  }

  revalidatePath(`/workspace/${workspaceId}/leads`);
  return { ok: true };
}

export type RemoveLeadState =
  | { ok?: boolean; formError?: string }
  | undefined;

export async function removeLead(
  workspaceId: string,
  leadId: string,
): Promise<RemoveLeadState> {
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

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageAnyLead(actorRole)) {
    return { formError: "You don't have permission to delete leads." };
  }

  const result = await Lead.deleteOne({ _id: leadId, workspace: workspaceId });
  if (result.deletedCount === 0) {
    return { formError: "Lead not found." };
  }

  revalidatePath(`/workspace/${workspaceId}/leads`);
  return { ok: true };
}
