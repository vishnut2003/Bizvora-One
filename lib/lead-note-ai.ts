import "server-only";

import { generateClaudeResponse } from "@/lib/claude";
import {
  LEAD_PRIORITY_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STAGE_LABEL,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/lib/lead";

/** The subset of lead fields we feed to Claude as drafting context. */
export type LeadNoteInput = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  stage?: string;
  source?: string;
  priority?: string;
  tags?: string[];
  /**
   * Earlier notes already logged on the lead, oldest first, each pre-formatted
   * as a line (e.g. "Jan 3 — Priya: Left a voicemail."). Used as prior context
   * so the new note continues the conversation instead of repeating it.
   */
  existingNotes?: string[];
  /** The rep's rough shorthand already in the note box, to polish/expand. */
  seed?: string;
};

const SYSTEM_PROMPT = `You are a CRM assistant inside BizvoraOne. Your job is to draft a single first-touch note for a newly captured sales lead.

RULES
- Write a concise, professional note: 2–4 sentences, plain text only. No markdown, no headings, no bullet points, no salutation, no sign-off.
- Cover, where the inputs support it: the context of the lead, their likely intent, and one suggested next step for the sales rep.
- If the rep provided rough notes (their "draft"), treat them as the source of truth and polish/expand them into the final note.
- If earlier notes on the lead are provided, treat them as prior conversation history: build on them, reflect the latest status, and suggest a sensible next step. Do NOT repeat or restate what earlier notes already say.
- Never invent facts, names, figures, or commitments that are not present in or clearly implied by the inputs. If details are thin, keep the note short and general rather than fabricating specifics.
- Write from the sales rep's perspective (e.g. "Reached out to…", "Lead came in via…"). Do not address the lead directly.
- Output ONLY the note text — nothing else.`;

function labelStage(value: string | undefined): string | null {
  if (!value) return null;
  return LEAD_STAGE_LABEL[value as LeadStage] ?? value;
}
function labelSource(value: string | undefined): string | null {
  if (!value) return null;
  return LEAD_SOURCE_LABEL[value as LeadSource] ?? value;
}
function labelPriority(value: string | undefined): string | null {
  if (!value) return null;
  return LEAD_PRIORITY_LABEL[value as LeadPriority] ?? value;
}

function buildUserMessage(input: LeadNoteInput): string {
  const lines: string[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value && value.trim().length > 0) lines.push(`- ${label}: ${value.trim()}`);
  };

  add("Name", input.name);
  add("Company", input.company);
  add("Email", input.email);
  add("Phone", input.phone);
  add("Stage", labelStage(input.stage));
  add("Source", labelSource(input.source));
  add("Priority", labelPriority(input.priority));
  if (input.tags && input.tags.length > 0) {
    add("Tags", input.tags.join(", "));
  }

  const details =
    lines.length > 0
      ? `Lead details:\n${lines.join("\n")}`
      : "No structured lead details were provided.";

  const history = (input.existingNotes ?? [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  const historyBlock = history.length
    ? `\n\nEarlier notes on this lead (oldest first):\n${history
        .map((n) => `- ${n}`)
        .join("\n")}`
    : "";

  const seed = input.seed?.trim();
  const seedBlock = seed
    ? `\n\nRep's rough notes to polish/expand:\n"""\n${seed}\n"""`
    : "";

  const task = history.length
    ? "Write the next note, continuing from the earlier notes."
    : "Write the first-touch note.";

  return `${details}${historyBlock}${seedBlock}\n\n${task}`;
}

/**
 * Draft a first-touch CRM note for a lead from the fields entered so far plus
 * any rough text the rep already typed. Returns the note text (may be empty if
 * the model produced nothing).
 */
export async function runLeadNoteAssistant(
  input: LeadNoteInput,
  workspaceName: string,
  signal?: AbortSignal,
): Promise<string> {
  const system = `${SYSTEM_PROMPT}\n\nWORKSPACE CONTEXT\n- Workspace / vendor: ${workspaceName}`;

  const response = await generateClaudeResponse({
    system,
    messages: [{ role: "user", content: buildUserMessage(input) }],
    temperature: 0.7,
    maxTokens: 512,
    cacheSystem: true,
    signal,
  });

  return response.text.trim();
}
