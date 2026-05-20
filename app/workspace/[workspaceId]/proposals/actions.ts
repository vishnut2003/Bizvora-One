"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import ProposalChat from "@/models/proposal-chat";
import Lead from "@/models/lead";
import Customer from "@/models/customer";
import { getActorRole } from "@/lib/workspace-access";
import type { UserRole } from "@/lib/user";
import { canViewAllLeads, canViewLeads } from "@/lib/lead";
import { canViewAllCustomers, canViewCustomers } from "@/lib/customer";
import {
  PROPOSAL_DOCUMENT_VERSION,
  runProposalAssistant,
  type ProposalDocument,
} from "@/lib/proposal-ai";
import type { ClaudeMessage } from "@/lib/claude";
import {
  serializeChat,
  type ChatDocLike,
  type SerializedProposalChat,
  type SerializedProposalMessage,
} from "./_lib/serialize";
import { stripMarkdown } from "./_lib/preview";
import {
  parseMentions,
  MENTION_TOKEN_REGEX,
  type MentionSearchResult,
  type MentionType,
} from "./_lib/mentions";

const ALLOWED_ROLES: ReadonlyArray<UserRole> = [
  "owner",
  "admin",
  "sales_manager",
  "sales_executive",
];

function canUseProposals(role: UserRole): boolean {
  return ALLOWED_ROLES.includes(role);
}

function buildTitleFromText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New proposal";
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

function buildPreview(text: string): string {
  const withoutMentions = text.replace(
    MENTION_TOKEN_REGEX,
    (_full, name: string) => `@${name}`,
  );
  const trimmed = stripMarkdown(withoutMentions);
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type LeadLookup = {
  _id: mongoose.Types.ObjectId;
  name: string;
  company?: string;
  jobTitle?: string;
  email?: string | null;
  phone?: string | null;
  website?: string;
  address?: { city?: string; state?: string; country?: string };
  stage?: string;
  source?: string;
  priority?: string;
  estimatedValue?: number;
};

type CustomerLookup = {
  _id: mongoose.Types.ObjectId;
  name: string;
  company?: string;
  jobTitle?: string;
  email?: string | null;
  phone?: string | null;
  website?: string;
  address?: { city?: string; state?: string; country?: string };
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  gstin?: string;
  pan?: string;
  status?: string;
  source?: string;
};

function describeLead(l: LeadLookup): string {
  const parts: string[] = [`name: ${l.name}`];
  if (l.company) parts.push(`company: ${l.company}`);
  if (l.jobTitle) parts.push(`title: ${l.jobTitle}`);
  if (l.email) parts.push(`email: ${l.email}`);
  if (l.phone) parts.push(`phone: ${l.phone}`);
  if (l.website) parts.push(`website: ${l.website}`);
  const addr = l.address ?? {};
  const addrStr = [addr.city, addr.state, addr.country].filter(Boolean).join(", ");
  if (addrStr) parts.push(`address: ${addrStr}`);
  if (l.stage) parts.push(`stage: ${l.stage}`);
  if (l.source) parts.push(`source: ${l.source}`);
  if (l.priority) parts.push(`priority: ${l.priority}`);
  if (typeof l.estimatedValue === "number" && l.estimatedValue > 0)
    parts.push(`estimated value: ${l.estimatedValue}`);
  return parts.join(", ");
}

function describeCustomer(c: CustomerLookup): string {
  const parts: string[] = [`name: ${c.name}`];
  if (c.company) parts.push(`company: ${c.company}`);
  if (c.jobTitle) parts.push(`title: ${c.jobTitle}`);
  if (c.email) parts.push(`email: ${c.email}`);
  if (c.phone) parts.push(`phone: ${c.phone}`);
  if (c.website) parts.push(`website: ${c.website}`);
  const addr = c.address ?? {};
  const addrStr = [addr.city, addr.state, addr.country].filter(Boolean).join(", ");
  if (addrStr) parts.push(`address: ${addrStr}`);
  const billing = c.billingAddress ?? {};
  const billingStr = [
    billing.line1,
    billing.line2,
    billing.city,
    billing.state,
    billing.postalCode,
    billing.country,
  ]
    .filter(Boolean)
    .join(", ");
  if (billingStr) parts.push(`billing address: ${billingStr}`);
  if (c.gstin) parts.push(`gstin: ${c.gstin}`);
  if (c.pan) parts.push(`pan: ${c.pan}`);
  if (c.status) parts.push(`status: ${c.status}`);
  if (c.source) parts.push(`source: ${c.source}`);
  return parts.join(", ");
}

async function expandMentionsInMessages(
  workspaceId: string,
  messages: ClaudeMessage[],
): Promise<ClaudeMessage[]> {
  const refs = new Map<string, { type: MentionType; id: string }>();
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const ref of parseMentions(m.content)) {
      refs.set(`${ref.type}:${ref.id}`, { type: ref.type, id: ref.id });
    }
  }
  if (refs.size === 0) return messages;

  const leadIds: string[] = [];
  const customerIds: string[] = [];
  for (const r of refs.values()) {
    if (r.type === "lead") leadIds.push(r.id);
    else customerIds.push(r.id);
  }

  const [leads, customers] = await Promise.all([
    leadIds.length
      ? (Lead.find({ workspace: workspaceId, _id: { $in: leadIds } })
          .lean()
          .exec() as Promise<LeadLookup[]>)
      : Promise.resolve([] as LeadLookup[]),
    customerIds.length
      ? (Customer.find({ workspace: workspaceId, _id: { $in: customerIds } })
          .lean()
          .exec() as Promise<CustomerLookup[]>)
      : Promise.resolve([] as CustomerLookup[]),
  ]);

  const leadById = new Map(leads.map((l) => [String(l._id), l]));
  const customerById = new Map(customers.map((c) => [String(c._id), c]));

  return messages.map((m) => {
    if (m.role !== "user") return m;
    const localRefs = parseMentions(m.content);
    if (localRefs.length === 0) return m;

    const lines: string[] = [];
    for (const ref of localRefs) {
      if (ref.type === "lead") {
        const l = leadById.get(ref.id);
        lines.push(
          l
            ? `- Lead "${l.name}" — ${describeLead(l)}`
            : `- Lead "${ref.name}" (no longer in CRM)`,
        );
      } else {
        const c = customerById.get(ref.id);
        lines.push(
          c
            ? `- Customer "${c.name}" — ${describeCustomer(c)}`
            : `- Customer "${ref.name}" (no longer in CRM)`,
        );
      }
    }

    const header =
      "[CRM References — the user mentioned these records from the workspace CRM. Use this data when drafting the proposal. Do not echo this header back to the user.]";
    const footer = "[End CRM References]";
    const userText = m.content.replace(
      MENTION_TOKEN_REGEX,
      (_full, name: string) => `@${name}`,
    );

    return {
      role: m.role,
      content: `${header}\n${lines.join("\n")}\n${footer}\n\n${userText}`,
    };
  });
}

async function loadWorkspaceForActor(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      error: "Your session expired. Please sign in again.",
    };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false as const, error: "Invalid workspace." };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { ok: false as const, error: "Workspace not found." };
  }

  const role = getActorRole(workspace, session.user.id);
  if (!canUseProposals(role)) {
    return {
      ok: false as const,
      error: "You don't have permission to use the proposal assistant.",
    };
  }

  return { ok: true as const, session, workspace, role };
}

type SendProposalMessageResult =
  | {
      ok: true;
      chat: SerializedProposalChat;
      assistantMessage: SerializedProposalMessage;
    }
  | { ok: false; error: string };

export async function sendProposalMessage(
  workspaceId: string,
  chatId: string | null,
  text: string,
): Promise<SendProposalMessageResult> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return ctx;
  const { session, workspace } = ctx;

  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Message can't be empty." };
  if (trimmed.length > 8000)
    return { ok: false, error: "Message is too long (max 8000 chars)." };

  // Load or create the chat
  let chat: Awaited<ReturnType<typeof ProposalChat.findOne>> | null = null;
  if (chatId) {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return { ok: false, error: "Invalid chat id." };
    }
    chat = await ProposalChat.findOne({
      _id: chatId,
      workspace: workspaceId,
      createdBy: session.user.id,
    });
    if (!chat) return { ok: false, error: "Chat not found." };
  } else {
    chat = await ProposalChat.create({
      workspace: workspaceId,
      createdBy: session.user.id,
      title: buildTitleFromText(trimmed),
      messages: [],
      lastMessagePreview: "",
    });
  }

  const now = new Date();

  // Push the user message first, persist immediately so we don't lose it if
  // the model call fails.
  chat.messages.push({
    role: "user",
    content: trimmed,
    proposal: null,
    attachments: [],
    createdAt: now,
  } as unknown as (typeof chat.messages)[number]);
  chat.lastMessagePreview = buildPreview(trimmed);
  await chat.save();

  // Build the Claude history from the persisted thread, then expand any
  // mention tokens into a CRM-context block so the model sees the actual
  // lead/customer data the user pointed at.
  const rawHistory: ClaudeMessage[] = chat.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as ClaudeMessage["role"],
      content: m.content,
    }));
  const history = await expandMentionsInMessages(workspaceId, rawHistory);

  const preparedByName =
    session.user.name?.trim() || session.user.email || "Sales team";

  let assistantText = "";
  let proposal: ProposalDocument | null = null;
  try {
    const result = await runProposalAssistant({
      workspaceName: workspace.name,
      preparedByName,
      history,
    });
    assistantText = result.text;
    proposal = result.proposal;
  } catch (err) {
    console.error("[sendProposalMessage] AI call failed", err);
    return {
      ok: false,
      error:
        err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
          ? "Claude API key is not configured."
          : "The assistant couldn't respond. Please try again.",
    };
  }

  const assistantMessage = {
    role: "assistant" as const,
    content:
      assistantText ||
      (proposal
        ? "Proposal generated — preview is rendering in the panel."
        : "(no response)"),
    proposal: proposal
      ? { version: PROPOSAL_DOCUMENT_VERSION, payload: proposal }
      : null,
    attachments: [],
    createdAt: new Date(),
  };

  chat.messages.push(
    assistantMessage as unknown as (typeof chat.messages)[number],
  );
  chat.lastMessagePreview = buildPreview(assistantMessage.content);
  await chat.save();

  // Refresh the rail's chat list (layout query) and, if this was an existing
  // chat, its detail page so the server-rendered messages stay in sync.
  revalidatePath(`/workspace/${workspaceId}/proposals`);
  revalidatePath(`/workspace/${workspaceId}/proposals/chat/${chat._id}`);

  const serialized = serializeChat(chat as unknown as ChatDocLike);
  const newAssistant = serialized.messages[serialized.messages.length - 1];

  return { ok: true, chat: serialized, assistantMessage: newAssistant };
}

type DeleteProposalChatResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteProposalChat(
  workspaceId: string,
  chatId: string,
): Promise<DeleteProposalChatResult> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return ctx;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return { ok: false, error: "Invalid chat id." };
  }

  const result = await ProposalChat.deleteOne({
    _id: chatId,
    workspace: workspaceId,
    createdBy: ctx.session.user.id,
  });
  if (result.deletedCount === 0) {
    return { ok: false, error: "Chat not found." };
  }

  revalidatePath(`/workspace/${workspaceId}/proposals`);
  return { ok: true };
}

type SearchMentionablesResult =
  | { ok: true; results: MentionSearchResult[] }
  | { ok: false; error: string };

export async function searchMentionables(
  workspaceId: string,
  query: string,
): Promise<SearchMentionablesResult> {
  const ctx = await loadWorkspaceForActor(workspaceId);
  if (!ctx.ok) return ctx;

  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 60) {
    return { ok: true, results: [] };
  }

  const re = new RegExp(escapeRegex(trimmed), "i");
  const userId = ctx.session.user.id;

  const leadFilter = canViewLeads(ctx.role)
    ? {
        workspace: workspaceId,
        $or: [{ name: re }, { company: re }, { email: re }],
        ...(canViewAllLeads(ctx.role) ? {} : { assignedTo: userId }),
      }
    : null;

  const customerFilter = canViewCustomers(ctx.role)
    ? {
        workspace: workspaceId,
        $or: [{ name: re }, { company: re }, { email: re }],
        ...(canViewAllCustomers(ctx.role) ? {} : { assignedTo: userId }),
      }
    : null;

  type Row = { _id: mongoose.Types.ObjectId; name: string; company?: string; email?: string | null };

  const [leads, customers] = await Promise.all([
    leadFilter
      ? (Lead.find(leadFilter)
          .select({ name: 1, company: 1, email: 1 })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean()
          .exec() as Promise<Row[]>)
      : Promise.resolve([] as Row[]),
    customerFilter
      ? (Customer.find(customerFilter)
          .select({ name: 1, company: 1, email: 1 })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean()
          .exec() as Promise<Row[]>)
      : Promise.resolve([] as Row[]),
  ]);

  const results: MentionSearchResult[] = [];
  for (const c of customers) {
    results.push({
      type: "customer",
      id: String(c._id),
      name: c.name,
      subtitle: c.company || c.email || "Customer",
    });
  }
  for (const l of leads) {
    results.push({
      type: "lead",
      id: String(l._id),
      name: l.name,
      subtitle: l.company || l.email || "Lead",
    });
  }

  return { ok: true, results };
}
