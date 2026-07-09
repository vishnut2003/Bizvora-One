import type { Metadata } from "next";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  Mail,
  Phone,
  Sparkles,
  Tag,
  TrendingUp,
  Trophy,
  UserCircle2,
  UserPlus,
} from "lucide-react";
import "@/lib/mongoose-filter";
import mongoose, { type FilterQuery } from "mongoose";
import Lead, {
  LEAD_FIELD_LABEL,
  LEAD_PRIORITIES,
  LEAD_PRIORITY_BADGE_CLASS,
  LEAD_PRIORITY_LABEL,
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  LEAD_STAGES,
  LEAD_STAGE_BADGE_CLASS,
  LEAD_STAGE_LABEL,
  OPEN_LEAD_STAGES,
  type ILead,
  type LeadActivityType,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/models/lead";
import User from "@/models/user";
import {
  LEAD_VIEWER_ROLES,
  canManageLead,
  canViewAllLeads,
} from "@/lib/lead";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import DashboardLayout from "@/layouts/dashboard-layout";
import AddLeadButton from "./_components/add-lead-button";
import EditLeadButton from "./_components/edit-lead-button";
import HistoryButton, {
  type HistoryEntry,
} from "./_components/history-button";
import LeadsToolbar from "./_components/leads-toolbar";
import type {
  LeadFormDefaults,
  LeadFormMember,
  LeadFormNote,
} from "./_components/lead-form-popup";

export const metadata: Metadata = {
  title: "Leads & Prospects — BizvoraOne",
};

type LeadsPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isLeadStage(v: string): v is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(v);
}
function isLeadSource(v: string): v is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(v);
}
function isLeadPriority(v: string): v is LeadPriority {
  return (LEAD_PRIORITIES as readonly string[]).includes(v);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Follow-up dates are date-only values stored at UTC midnight. Format them in
// UTC so the calendar day is stable regardless of the runtime timezone.
function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatAbsoluteDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function resolveAssigneeName(
  id: string | null | undefined,
  userById: Map<string, { id: string; name: string }>,
): string {
  if (!id) return "Unassigned";
  return userById.get(String(id))?.name ?? "Someone";
}

function buildActivitySummary(
  type: LeadActivityType,
  data: Record<string, unknown>,
  userById: Map<string, { id: string; name: string }>,
): string {
  switch (type) {
    case "created":
      return "created the lead.";
    case "stage_changed": {
      const from = data.from as LeadStage | undefined;
      const to = data.to as LeadStage | undefined;
      const fromLabel = from ? LEAD_STAGE_LABEL[from] : "—";
      const toLabel = to ? LEAD_STAGE_LABEL[to] : "—";
      return `moved the lead from ${fromLabel} → ${toLabel}.`;
    }
    case "priority_changed": {
      const from = data.from as LeadPriority | undefined;
      const to = data.to as LeadPriority | undefined;
      const fromLabel = from ? LEAD_PRIORITY_LABEL[from] : "—";
      const toLabel = to ? LEAD_PRIORITY_LABEL[to] : "—";
      return `changed priority from ${fromLabel} → ${toLabel}.`;
    }
    case "assignee_changed": {
      const fromName = resolveAssigneeName(
        data.from as string | null,
        userById,
      );
      const toName = resolveAssigneeName(data.to as string | null, userById);
      return `reassigned the lead from ${fromName} → ${toName}.`;
    }
    case "note_added":
      return "added a note.";
    case "follow_up_changed": {
      const from = data.from as string | null | undefined;
      const to = data.to as string | null | undefined;
      const fromLabel = from ? formatDateOnly(new Date(from)) : "—";
      const toLabel = to ? formatDateOnly(new Date(to)) : "—";
      if (!from && to) return `set the follow-up to ${toLabel}.`;
      if (from && !to) return "cleared the follow-up.";
      return `moved follow-up from ${fromLabel} → ${toLabel}.`;
    }
    case "tags_changed": {
      const added = (data.added as string[] | undefined) ?? [];
      const removed = (data.removed as string[] | undefined) ?? [];
      const parts: string[] = [];
      if (added.length) parts.push(`added ${added.join(", ")}`);
      if (removed.length) parts.push(`removed ${removed.join(", ")}`);
      return `${parts.join(" · ") || "updated tags"}.`;
    }
    case "details_updated": {
      const fields = ((data.fields as string[] | undefined) ?? []).map(
        (f) => LEAD_FIELD_LABEL[f] ?? f,
      );
      if (fields.length === 0) return "updated details.";
      if (fields.length === 1) return `updated ${fields[0]}.`;
      if (fields.length === 2) return `updated ${fields[0]} and ${fields[1]}.`;
      const last = fields[fields.length - 1];
      return `updated ${fields.slice(0, -1).join(", ")}, and ${last}.`;
    }
    case "converted_to_customer": {
      const customerName = data.customerName as string | undefined;
      if (customerName)
        return `converted the lead into customer ${customerName}.`;
      return "converted the lead into a customer.";
    }
    case "quotation_created": {
      const number = data.quotationNumber as string | undefined;
      return number
        ? `created quotation ${number}.`
        : "created a new quotation for this lead.";
    }
  }
}

function formatMoney(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactMoney(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-IN");
}

function relativeDay(date: Date): {
  label: string;
  tone: "overdue" | "today" | "soon" | "future";
} {
  // Compare calendar days in UTC — follow-up dates are stored at UTC midnight,
  // and "today" is the UTC calendar day. This keeps the label independent of
  // the runtime timezone (Vercel runs in UTC).
  const now = new Date();
  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const target = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((target - start) / dayMs);

  if (diffDays < 0)
    return {
      label: `${Math.abs(diffDays)}d overdue`,
      tone: "overdue",
    };
  if (diffDays === 0) return { label: "Today", tone: "today" };
  if (diffDays <= 3) return { label: `in ${diffDays}d`, tone: "soon" };
  return { label: formatDateOnly(date), tone: "future" };
}

const followUpToneClass: Record<
  ReturnType<typeof relativeDay>["tone"],
  string
> = {
  overdue:
    "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25",
  today:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  soon: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  future:
    "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25",
};

const STAGE_ACCENT_BORDER: Record<LeadStage, string> = {
  new: "before:bg-sky-500",
  attempting_contact: "before:bg-cyan-500",
  contacted: "before:bg-indigo-500",
  qualified: "before:bg-violet-500",
  proposal_sent: "before:bg-blue-500",
  negotiation: "before:bg-amber-500",
  won: "before:bg-emerald-500",
  lost: "before:bg-rose-500",
  follow_up: "before:bg-fuchsia-500",
};

const STAGE_SEGMENT_BG: Record<LeadStage, string> = {
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

const PRIORITY_RING_CLASS: Record<LeadPriority, string> = {
  low: "bg-zinc-300 dark:bg-zinc-600",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
};

type LeanLead = ILead & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export default async function LeadsPage({
  params,
  searchParams,
}: LeadsPageProps) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: LEAD_VIEWER_ROLES,
  });

  // Filters
  const qRaw = asString(sp.q)?.trim() ?? "";
  const stageRaw = asString(sp.stage) ?? "open";
  const priorityRaw = asString(sp.priority) ?? "all";
  const sourceRaw = asString(sp.source) ?? "all";
  const assigneeRaw = asString(sp.assignee) ?? "all";

  // Visibility scope: sales executives only see leads assigned to them.
  // Everyone else (owner / admin / sales_manager) sees every lead in the workspace.
  const visibilityScope: FilterQuery<ILead> = canViewAllLeads(myRole)
    ? { workspace: workspaceId }
    : { workspace: workspaceId, assignedTo: session.user.id };

  const filter: FilterQuery<ILead> = { ...visibilityScope };

  if (stageRaw === "open") {
    filter.stage = { $in: OPEN_LEAD_STAGES };
  } else if (stageRaw !== "all" && isLeadStage(stageRaw)) {
    filter.stage = stageRaw;
  }
  if (isLeadPriority(priorityRaw)) filter.priority = priorityRaw;
  if (isLeadSource(sourceRaw)) filter.source = sourceRaw;
  // Assignee filter is ignored for sales executives — their visibility is
  // already locked to leads assigned to themselves.
  if (canViewAllLeads(myRole)) {
    if (assigneeRaw === "me") filter.assignedTo = session.user.id;
    else if (assigneeRaw === "unassigned") filter.assignedTo = null;
    else if (assigneeRaw !== "all" && assigneeRaw.length > 0)
      filter.assignedTo = assigneeRaw;
  }

  if (qRaw.length > 0) {
    const re = new RegExp(escapeRegex(qRaw), "i");
    filter.$or = [
      { name: re },
      { email: re },
      { company: re },
      { phone: re },
      { tags: re },
    ];
  }

  // Workspace members for assignee dropdowns + name lookup
  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];
  const uniqueMemberIds = Array.from(new Set(memberIds));

  const [leadsRaw, memberUsers] = await Promise.all([
    Lead.find(filter)
      .sort({
        priority: 1, // tiebreaker (alpha) — overridden below
        nextFollowUpAt: 1,
        updatedAt: -1,
      })
      .limit(500)
      .lean(),
    User.find({ _id: { $in: uniqueMemberIds } })
      .select("name email image")
      .lean(),
  ]);

  const leads = leadsRaw as unknown as LeanLead[];

  const userById = new Map(
    memberUsers.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        name: u.name as string,
        email: u.email as string,
        image: (u.image as string | null | undefined) ?? null,
      },
    ]),
  );

  const salesExecIds = new Set(
    (doc.members ?? [])
      .filter((m) => m.role === "sales_executive")
      .map((m) => String(m.user)),
  );

  const assignableMembers: LeadFormMember[] = Array.from(salesExecIds)
    .map((id) => userById.get(id))
    .filter((m) => m !== undefined);

  // Priority sort weight applied after fetch
  const priorityWeight: Record<LeadPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  leads.sort((a, b) => {
    const pa = priorityWeight[a.priority as LeadPriority] ?? 2;
    const pb = priorityWeight[b.priority as LeadPriority] ?? 2;
    if (pa !== pb) return pa - pb;
    const aFu = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : null;
    const bFu = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : null;
    if (aFu !== null && bFu !== null) return aFu - bFu;
    if (aFu !== null) return -1;
    if (bFu !== null) return 1;
    return (
      new Date(b.updatedAt as Date).getTime() -
      new Date(a.updatedAt as Date).getTime()
    );
  });

  // Stats — independent of filters, scoped to workspace
  const now = new Date();
  // Follow-up dates are stored at UTC midnight, so bucket "today"/"overdue"
  // against UTC calendar-day boundaries to match.
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
  const restrictToSelf = !canViewAllLeads(myRole);
  const aggMatch: Record<string, unknown> = { workspace: workspaceObjectId };
  if (restrictToSelf) {
    aggMatch.assignedTo = new mongoose.Types.ObjectId(session.user.id);
  }
  const scopeForCount: FilterQuery<ILead> = { ...visibilityScope };

  type StageAgg = { _id: LeadStage; count: number; value: number };
  const [stageAggRaw, dueTodayCount, overdueCount, wonThisMonth] =
    await Promise.all([
      Lead.aggregate<StageAgg>([
        { $match: aggMatch },
        {
          $group: {
            _id: "$stage",
            count: { $sum: 1 },
            value: { $sum: { $ifNull: ["$estimatedValue", 0] } },
          },
        },
      ]),
      Lead.countDocuments({
        ...scopeForCount,
        nextFollowUpAt: { $gte: dayStart, $lt: dayEnd },
      }),
      Lead.countDocuments({
        ...scopeForCount,
        stage: { $in: OPEN_LEAD_STAGES },
        nextFollowUpAt: { $lt: dayStart, $ne: null },
      }),
      Lead.countDocuments({
        ...scopeForCount,
        stage: "won",
        wonAt: { $gte: monthStart },
      }),
    ]);

  const stageCounts = new Map<LeadStage, number>();
  const stageValues = new Map<LeadStage, number>();
  for (const row of stageAggRaw) {
    stageCounts.set(row._id, row.count);
    stageValues.set(row._id, row.value);
  }
  const openCount = OPEN_LEAD_STAGES.reduce(
    (sum, s) => sum + (stageCounts.get(s) ?? 0),
    0,
  );
  const pipelineValue = OPEN_LEAD_STAGES.reduce(
    (sum, s) => sum + (stageValues.get(s) ?? 0),
    0,
  );
  const stageDistribution = OPEN_LEAD_STAGES.map((s) => ({
    stage: s,
    count: stageCounts.get(s) ?? 0,
  }));
  const totalOpenForDistribution = stageDistribution.reduce(
    (sum, s) => sum + s.count,
    0,
  );

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role: myRole,
  };

  const stats: Array<{
    label: string;
    value: string;
    sub?: string;
    icon: typeof UserCircle2;
    accent: string;
  }> = [
    {
      label: "Open leads",
      value: String(openCount),
      sub: pipelineValue > 0 ? formatCompactMoney(pipelineValue) : undefined,
      icon: UserCircle2,
      accent: "from-violet-500 to-purple-700",
    },
    {
      label: "Follow-ups today",
      value: String(dueTodayCount),
      icon: CalendarClock,
      accent: "from-blue-500 to-indigo-700",
    },
    {
      label: "Overdue follow-ups",
      value: String(overdueCount),
      icon: AlarmClock,
      accent: "from-rose-500 to-red-700",
    },
    {
      label: "Won this month",
      value: String(wonThisMonth),
      icon: Trophy,
      accent: "from-emerald-500 to-teal-700",
    },
  ];

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.14] dark:via-zinc-900 dark:to-secondary/[0.10]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-gradient-to-tr from-secondary/15 to-primary/10 opacity-30 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <Sparkles className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Sales pipeline
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Leads & Prospects
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  {canViewAllLeads(myRole)
                    ? "Track every lead through the pipeline in "
                    : "Your assigned leads in "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            <AddLeadButton
              workspaceId={workspace.id}
              actorRole={myRole}
              currentUserId={session.user.id}
              members={assignableMembers}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${stat.accent}`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${stat.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="relative mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.sub ? (
                  <p className="relative mt-1 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                    <IndianRupee className="h-3 w-3" />
                    {stat.sub}
                    <span className="font-normal text-zinc-400 dark:text-zinc-500">
                      in pipeline
                    </span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Pipeline distribution */}
        {totalOpenForDistribution > 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                  />
                  <TrendingUp className="relative h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                    Pipeline by stage
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {totalOpenForDistribution} open{" "}
                    {totalOpenForDistribution === 1 ? "lead" : "leads"} across
                    the funnel
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {stageDistribution
                .filter((s) => s.count > 0)
                .map((s) => {
                  const pct = (s.count / totalOpenForDistribution) * 100;
                  return (
                    <div
                      key={s.stage}
                      className={cn(
                        "h-full first:rounded-l-full last:rounded-r-full transition-all",
                        STAGE_SEGMENT_BG[s.stage],
                      )}
                      style={{ width: `${pct}%` }}
                      title={`${LEAD_STAGE_LABEL[s.stage]}: ${s.count}`}
                    />
                  );
                })}
            </div>
            <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
              {stageDistribution.map((s) => (
                <li
                  key={s.stage}
                  className="flex items-center gap-1.5 text-[11.5px]"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      STAGE_SEGMENT_BG[s.stage],
                    )}
                  />
                  <span className="truncate text-zinc-500 dark:text-zinc-400">
                    {LEAD_STAGE_LABEL[s.stage]}
                  </span>
                  <span className="ml-auto font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <LeadsToolbar
          members={assignableMembers.map(({ id, name }) => ({ id, name }))}
          currentUserId={session.user.id}
          showAssigneeFilter={canViewAllLeads(myRole)}
        />

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                {leads.length} {leads.length === 1 ? "lead" : "leads"}
              </h2>
              {leads.length > 0 ? (
                <span className="inline-flex h-5 items-center rounded-full bg-zinc-100 px-2 text-[10.5px] font-medium tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Sorted by priority
                </span>
              ) : null}
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.04] dark:from-primary/[0.08] dark:to-secondary/[0.06]"
              />
              <div className="relative flex flex-col items-center px-5 py-14 text-center">
                <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
                  />
                  <UserPlus className="relative h-6 w-6" />
                </span>
                <p className="mt-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  No leads match these filters.
                </p>
                <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Clear filters from the toolbar above, or capture a fresh lead
                  to get started.
                </p>
                <div className="mt-5">
                  <AddLeadButton
                    workspaceId={workspace.id}
                    actorRole={myRole}
                    currentUserId={session.user.id}
                    members={assignableMembers}
                  />
                </div>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {leads.map((lead) => {
                const leadId = lead._id.toString();
                const assignedToId = lead.assignedTo
                  ? String(lead.assignedTo)
                  : null;
                const assignee = assignedToId
                  ? userById.get(assignedToId)
                  : null;
                const canEdit = canManageLead(
                  myRole,
                  session.user.id,
                  assignedToId,
                );

                const stage = lead.stage as LeadStage;
                const priority = lead.priority as LeadPriority;
                const source = lead.source as LeadSource;
                const followUp = lead.nextFollowUpAt
                  ? new Date(lead.nextFollowUpAt)
                  : null;
                const followUpRel = followUp ? relativeDay(followUp) : null;
                const isClosed = stage === "won" || stage === "lost";

                const defaultsForEdit: LeadFormDefaults = {
                  name: lead.name,
                  email: lead.email ?? "",
                  phone: lead.phone ?? "",
                  company: lead.company ?? "",
                  jobTitle: lead.jobTitle ?? "",
                  website: lead.website ?? "",
                  city: lead.address?.city ?? "",
                  state: lead.address?.state ?? "",
                  country: lead.address?.country ?? "",
                  stage,
                  source,
                  priority,
                  estimatedValue:
                    lead.estimatedValue && lead.estimatedValue > 0
                      ? String(lead.estimatedValue)
                      : "",
                  assignedTo: assignedToId ?? "",
                  tags: (lead.tags ?? []).join(", "),
                  nextFollowUpAt: followUp
                    ? followUp.toISOString().slice(0, 10)
                    : "",
                  lostReason: lead.lostReason ?? "",
                };

                const notesForEdit: LeadFormNote[] = (lead.notes ?? [])
                  .slice()
                  .reverse()
                  .map((n, idx) => {
                    const authorId = String(n.author);
                    return {
                      id: `${leadId}-note-${idx}`,
                      body: n.body,
                      authorName:
                        userById.get(authorId)?.name ?? "Unknown",
                      createdAt: timeAgo(n.createdAt as Date),
                    };
                  });

                const historyEntries: HistoryEntry[] = (lead.activity ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.at as Date).getTime() -
                      new Date(a.at as Date).getTime(),
                  )
                  .map((a, idx) => {
                    const actor = userById.get(String(a.actor));
                    const actorName = actor?.name ?? "Someone";
                    const type = a.type as LeadActivityType;
                    const data =
                      (a.data as Record<string, unknown> | undefined) ?? {};
                    const at = new Date(a.at as Date);
                    return {
                      id: `${leadId}-act-${idx}`,
                      type,
                      actorName,
                      actorInitial:
                        actorName.trim().charAt(0).toUpperCase() || "?",
                      at: timeAgo(at),
                      atAbs: formatAbsoluteDateTime(at),
                      summary: buildActivitySummary(type, data, userById),
                      body:
                        type === "note_added"
                          ? (data.body as string | undefined)
                          : undefined,
                    };
                  });

                return (
                  <li
                    key={leadId}
                    className={cn(
                      "group relative px-5 py-4 pl-6 transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-[''] hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30",
                      STAGE_ACCENT_BORDER[stage],
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="relative shrink-0">
                        <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-[14px] font-semibold text-white shadow-sm shadow-primary/20">
                          <span
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                          />
                          <span className="relative">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          title={`Priority: ${LEAD_PRIORITY_LABEL[priority]}`}
                          className={cn(
                            "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-zinc-900",
                            PRIORITY_RING_CLASS[priority],
                          )}
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {lead.name}
                          </p>
                          {lead.company ? (
                            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                              · {lead.company}
                              {lead.jobTitle ? ` · ${lead.jobTitle}` : ""}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                          {lead.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <a
                                href={`mailto:${lead.email}`}
                                className="hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                {lead.email}
                              </a>
                            </span>
                          ) : null}
                          {lead.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <a
                                href={`tel:${lead.phone}`}
                                className="hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                {lead.phone}
                              </a>
                            </span>
                          ) : null}
                          {lead.estimatedValue && lead.estimatedValue > 0 ? (
                            <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                              {formatMoney(lead.estimatedValue)}
                            </span>
                          ) : null}
                          <span>
                            Source: {LEAD_SOURCE_LABEL[source]}
                          </span>
                        </div>

                        {(lead.tags ?? []).length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {(lead.tags ?? []).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                            LEAD_STAGE_BADGE_CLASS[stage],
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              STAGE_SEGMENT_BG[stage],
                            )}
                          />
                          {LEAD_STAGE_LABEL[stage]}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                            LEAD_PRIORITY_BADGE_CLASS[priority],
                          )}
                        >
                          <span
                            className={cn(
                              "h-1 w-1 rounded-full",
                              PRIORITY_RING_CLASS[priority],
                            )}
                          />
                          {LEAD_PRIORITY_LABEL[priority]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[11.5px] dark:border-zinc-800">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <UserCircle2 className="h-3.5 w-3.5" />
                          {assignee ? (
                            <>
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {assignee.name}
                              </span>
                              {assignee.id === session.user.id ? (
                                <span className="text-zinc-400 dark:text-zinc-500">
                                  (you)
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="italic">Unassigned</span>
                          )}
                        </span>

                        {followUp && !isClosed && followUpRel ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                              followUpToneClass[followUpRel.tone],
                            )}
                          >
                            <CalendarClock className="h-3 w-3" />
                            Follow-up {followUpRel.label}
                          </span>
                        ) : null}

                        {stage === "won" && lead.wonAt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Won {formatDate(new Date(lead.wonAt))}
                          </span>
                        ) : null}

                        {lead.lastContactedAt ? (
                          <span>
                            Last contact{" "}
                            {timeAgo(new Date(lead.lastContactedAt))}
                          </span>
                        ) : (
                          <span>
                            Created {timeAgo(new Date(lead.createdAt as Date))}
                          </span>
                        )}

                        {(lead.notes?.length ?? 0) > 0 ? (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {lead.notes!.length}{" "}
                            {lead.notes!.length === 1 ? "note" : "notes"}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <HistoryButton
                          leadName={lead.name}
                          entries={historyEntries}
                        />
                        {canEdit ? (
                          <EditLeadButton
                            workspaceId={workspace.id}
                            leadId={leadId}
                            leadName={lead.name}
                            defaults={defaultsForEdit}
                            notes={notesForEdit}
                            members={assignableMembers}
                            currentUserId={session.user.id}
                            actorRole={myRole}
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

