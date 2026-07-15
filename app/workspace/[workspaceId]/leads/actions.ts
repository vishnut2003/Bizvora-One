"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import { canViewLeads } from "@/lib/lead";
import { runLeadNoteAssistant, type LeadNoteInput } from "@/lib/lead-note-ai";
import { getActorRole } from "@/lib/workspace-access";
import {
  createLeadForActor,
  parseLeadInput,
  updateLeadForActor,
  type LeadFieldErrors,
  type LeadServiceResult,
} from "@/lib/services/lead-service";

export type LeadFormErrors = LeadFieldErrors;

export type LeadActionState =
  | {
      ok?: boolean;
      errors?: LeadFormErrors;
      formError?: string;
    }
  | undefined;

const LEAD_FORM_KEYS = [
  "name",
  "email",
  "phone",
  "company",
  "jobTitle",
  "website",
  "city",
  "state",
  "country",
  "stage",
  "source",
  "priority",
  "estimatedValue",
  "assignedTo",
  "tags",
  "nextFollowUpAt",
  "lostReason",
  "noteBody",
] as const;

function formDataToRecord(formData: FormData): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of LEAD_FORM_KEYS) {
    record[key] = String(formData.get(key) ?? "");
  }
  return record;
}

function mapServiceFailure(
  result: Exclude<LeadServiceResult, { ok: true }>,
  verb: "add" | "edit",
): LeadActionState {
  switch (result.code) {
    case "forbidden":
      return { formError: `You don't have permission to ${verb} leads.` };
    case "lead_not_found":
      return { formError: "Lead not found." };
    case "cannot_manage":
      return { formError: "You can't edit this lead." };
    case "validation":
      return { errors: result.fieldErrors };
    case "save_failed":
      return { formError: `${result.message} Please try again.` };
  }
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

  const parsed = parseLeadInput(formDataToRecord(formData));
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const result = await createLeadForActor(
    {
      actorId: session.user.id,
      role: getActorRole(workspace, session.user.id),
      workspace,
    },
    data,
  );

  if (!result.ok) return mapServiceFailure(result, "add");

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

  const parsed = parseLeadInput(formDataToRecord(formData));
  if (parsed.errors) return { errors: parsed.errors };
  const data = parsed.data!;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const result = await updateLeadForActor(
    {
      actorId: session.user.id,
      role: getActorRole(workspace, session.user.id),
      workspace,
    },
    leadId,
    data,
  );

  if (!result.ok) return mapServiceFailure(result, "edit");

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
