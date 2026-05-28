import "server-only";

import {
  generateClaudeResponse,
  type ClaudeMessage,
  type ClaudeTool,
} from "@/lib/claude";

export const PROPOSAL_DOCUMENT_VERSION = 1;

export type ProposalSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type ProposalPricingItem = {
  description: string;
  quantity?: number;
  unitPrice: number;
};

export type ProposalPricing = {
  currency: string;
  items: ProposalPricingItem[];
  notes?: string;
};

export type ProposalTimelineEntry = {
  milestone: string;
  when: string;
};

export type ProposalParty = {
  name: string;
  company?: string;
  email?: string;
};

export type ProposalDocument = {
  title: string;
  client: {
    name: string;
    company?: string;
    address?: string;
  };
  preparedBy: ProposalParty;
  date: string;
  summary: string;
  sections: ProposalSection[];
  pricing?: ProposalPricing;
  timeline?: ProposalTimelineEntry[];
  terms?: string[];
};

/**
 * JSON Schema for the generate_proposal_pdf tool. Mirrors `ProposalDocument`.
 * Kept in lockstep with the TS type — when you change one, change the other.
 */
const proposalToolSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Headline title for the proposal." },
    client: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        address: { type: "string" },
      },
      required: ["name"],
    },
    preparedBy: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
      },
      required: ["name", "company"],
    },
    date: {
      type: "string",
      description: "ISO 8601 date string for the proposal (today is fine).",
    },
    summary: {
      type: "string",
      description: "Executive summary paragraph framing the engagement.",
    },
    sections: {
      type: "array",
      description:
        "Ordered sections like scope, deliverables, approach. Each section has a heading, prose body, and optional bullets.",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "body"],
      },
    },
    pricing: {
      type: "object",
      description: "Investment table. Omit if pricing is not yet defined.",
      properties: {
        currency: {
          type: "string",
          description:
            "ISO currency code (INR, USD, EUR …) or symbol the client uses.",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
            required: ["description", "unitPrice"],
          },
        },
        notes: { type: "string" },
      },
      required: ["currency", "items"],
    },
    timeline: {
      type: "array",
      description: "Key milestones with rough dates or durations.",
      items: {
        type: "object",
        properties: {
          milestone: { type: "string" },
          when: { type: "string" },
        },
        required: ["milestone", "when"],
      },
    },
    terms: {
      type: "array",
      description: "Short bulleted terms & conditions.",
      items: { type: "string" },
    },
  },
  required: ["title", "client", "preparedBy", "date", "summary", "sections"],
} as const;

const generateProposalPdfTool: ClaudeTool = {
  name: "generate_proposal_pdf",
  description:
    "Emit a fully-formed proposal document. The frontend will render the returned data as a PDF for the user. Call this ONLY when the user explicitly asks to generate, draft, create, or build the proposal PDF — not for general discussion.",
  input_schema: proposalToolSchema,
};

const SYSTEM_PROMPT = `You are the proposal assistant inside the BizvoraOne. Your ONLY job is to help the sales team build client proposals.

RULES
- Help with: drafting proposal copy, scope, pricing, timelines, terms, executive summaries, and generating the final proposal PDF for a client.
- Refuse anything else (general chat, coding help, jokes, unrelated business questions) with a short, friendly note that you can only assist with proposals, and steer the conversation back.
- Ask short, focused follow-up questions when you need missing information (client name, engagement type, budget, duration). Do not over-interrogate — make reasonable assumptions and call them out.
- When the user explicitly asks to GENERATE, BUILD, CREATE, or PRODUCE the proposal PDF (or "send to client", "make the PDF", etc.), call the generate_proposal_pdf tool with the most complete proposal you can assemble from the conversation so far. Fill any clearly-missing optional fields with sensible defaults; never invent client-confidential financial details that haven't been discussed.
- Do NOT call the tool for casual drafting questions ("can you outline pricing?" → just write text). Tool calls are reserved for producing the final downloadable document.
- Default currency is INR unless the user specifies otherwise.
- Format dates as ISO 8601 (YYYY-MM-DD).
- Keep replies concise. Use plain text or short markdown — no excessive emojis.`;

export type ProposalAssistantInput = {
  workspaceName: string;
  preparedByName: string;
  history: ClaudeMessage[];
  signal?: AbortSignal;
};

export type ProposalAssistantResult = {
  text: string;
  proposal: ProposalDocument | null;
};

/**
 * Single turn of the proposal assistant. Returns the assistant's text reply
 * and, when the user asked for a PDF, the structured proposal document.
 */
export async function runProposalAssistant({
  workspaceName,
  preparedByName,
  history,
  signal,
}: ProposalAssistantInput): Promise<ProposalAssistantResult> {
  const system = `${SYSTEM_PROMPT}\n\nWORKSPACE CONTEXT\n- Workspace / vendor: ${workspaceName}\n- Operator name: ${preparedByName}\n- When a proposal is generated, default preparedBy.company to "${workspaceName}" and preparedBy.name to "${preparedByName}" unless the user provides others.`;

  const response = await generateClaudeResponse({
    system,
    messages: history,
    tools: [generateProposalPdfTool],
    cacheSystem: true,
    signal,
  });

  const proposalCall = response.toolCalls.find(
    (c) => c.name === "generate_proposal_pdf",
  );

  // Fallback text — if the model called the tool and gave no narration, we
  // synthesise a short user-facing confirmation so the chat doesn't look empty.
  const fallbackProposalText =
    "Proposal PDF generated — preview is loading in the panel on the right.";

  return {
    text:
      response.text.trim() ||
      (proposalCall ? fallbackProposalText : ""),
    proposal: proposalCall
      ? (proposalCall.input as unknown as ProposalDocument)
      : null,
  };
}
