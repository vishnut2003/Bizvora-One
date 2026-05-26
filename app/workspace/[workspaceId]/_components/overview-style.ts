import type { LeadStage } from "@/lib/lead";

// Per-stage dot colors used in the overview distribution bars / legends.
// lead.ts only exports full badge classes — we need solid swatches here.
export const LEAD_STAGE_DOT_COLOR_OVERRIDE: Record<LeadStage, string> = {
  new: "bg-sky-500",
  attempting_contact: "bg-cyan-500",
  contacted: "bg-indigo-500",
  qualified: "bg-violet-500",
  proposal_sent: "bg-blue-500",
  negotiation: "bg-amber-500",
  won: "bg-emerald-500",
  lost: "bg-rose-500",
  follow_up: "bg-fuchsia-500",
};
