import type { UserRole } from "@/lib/user";

export const LEAD_STAGES = [
  "new",
  "attempting_contact",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "follow_up",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: "New Lead",
  attempting_contact: "Attempting Contact",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  follow_up: "Follow-Up",
};

export const LEAD_STAGE_BADGE_CLASS: Record<LeadStage, string> = {
  new: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  attempting_contact:
    "bg-cyan-100 text-cyan-700 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/25",
  contacted:
    "bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
  qualified:
    "bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  proposal_sent:
    "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
  negotiation:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  won: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  lost: "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  follow_up:
    "bg-fuchsia-100 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/25",
};

export const OPEN_LEAD_STAGES: LeadStage[] = LEAD_STAGES.filter(
  (s) => s !== "won" && s !== "lost",
);

export const LEAD_SOURCES = [
  "website",
  "referral",
  "cold_call",
  "cold_email",
  "email_campaign",
  "social_media",
  "linkedin",
  "trade_show",
  "advertisement",
  "partner",
  "inbound_chat",
  "walk_in",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  cold_email: "Cold Email",
  email_campaign: "Email Campaign",
  social_media: "Social Media",
  linkedin: "LinkedIn",
  trade_show: "Trade Show / Event",
  advertisement: "Advertisement",
  partner: "Partner",
  inbound_chat: "Inbound Chat",
  walk_in: "Walk-In",
  other: "Other",
};

export const LEAD_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LEAD_PRIORITY_LABEL: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const LEAD_PRIORITY_BADGE_CLASS: Record<LeadPriority, string> = {
  low: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25",
  medium:
    "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
  high: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  urgent:
    "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
};

export const LEAD_ACTIVITY_TYPES = [
  "created",
  "stage_changed",
  "priority_changed",
  "assignee_changed",
  "note_added",
  "follow_up_changed",
  "tags_changed",
  "details_updated",
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const LEAD_ACTIVITY_LABEL: Record<LeadActivityType, string> = {
  created: "Lead created",
  stage_changed: "Stage changed",
  priority_changed: "Priority changed",
  assignee_changed: "Reassigned",
  note_added: "Note added",
  follow_up_changed: "Follow-up updated",
  tags_changed: "Tags updated",
  details_updated: "Details updated",
};

// Human labels for the field keys emitted by the `details_updated` event.
export const LEAD_FIELD_LABEL: Record<string, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  company: "company",
  jobTitle: "job title",
  website: "website",
  source: "source",
  estimatedValue: "value",
  city: "city",
  state: "state",
  country: "country",
  lostReason: "lost reason",
};

export const LEAD_VIEWER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "sales_manager",
  "sales_executive",
];

export const LEAD_FULL_MANAGER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "sales_manager",
];

export function canViewLeads(role: UserRole): boolean {
  return LEAD_VIEWER_ROLES.includes(role);
}

// Whether the actor can see every lead in the workspace.
// Sales executives are scoped to their own assigned leads.
export function canViewAllLeads(role: UserRole): boolean {
  return role !== "sales_executive";
}

export function canManageAnyLead(role: UserRole): boolean {
  return LEAD_FULL_MANAGER_ROLES.includes(role);
}

export function canManageLead(
  role: UserRole,
  userId: string,
  assignedTo: string | null | undefined,
): boolean {
  if (canManageAnyLead(role)) return true;
  if (role === "sales_executive" && assignedTo && assignedTo === userId)
    return true;
  return false;
}
