import {
  Activity,
  Award,
  FileSpreadsheet,
  Layers,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import mongoose, { type FilterQuery } from "mongoose";
import Link from "next/link";
import Lead, { type ILead } from "@/models/lead";
import Customer from "@/models/customer";
import Quotation from "@/models/quotation";
import { LEAD_STAGES, LEAD_STAGE_LABEL, OPEN_LEAD_STAGES } from "@/lib/lead";
import { formatCurrency } from "@/lib/voucher";
import { timeAgo } from "@/lib/time";
import {
  DistributionList,
  EmptyRow,
  SectionCard,
  type StatTile,
} from "./overview-widgets";
import {
  ActivityFeed,
  SecondaryStatStrip,
  StatGrid,
} from "./executive-overview";
import { LEAD_STAGE_DOT_COLOR_OVERRIDE } from "./overview-style";

type LeanActivity = {
  type: string;
  actor: unknown;
  at: Date;
  data?: Record<string, unknown>;
};

type LeanLeadActivity = ILead & {
  _id: { toString(): string };
  activity?: LeanActivity[];
};

export default async function SalesOverview({
  workspaceId,
  userId,
  mineOnly,
}: {
  workspaceId: string;
  userId: string;
  mineOnly: boolean;
}) {
  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const userObj = new mongoose.Types.ObjectId(userId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const baseLeadFilter: FilterQuery<ILead> = mineOnly
    ? { workspace: workspaceId, assignedTo: userId }
    : { workspace: workspaceId };

  const baseLeadAgg: Record<string, unknown> = mineOnly
    ? { workspace: wsObj, assignedTo: userObj }
    : { workspace: wsObj };

  const baseQuoteFilter: Record<string, unknown> = mineOnly
    ? {
        workspace: workspaceId,
        $or: [{ createdBy: userId }, { assignedTo: userId }],
      }
    : { workspace: workspaceId };

  const baseCustomerFilter: Record<string, unknown> = mineOnly
    ? { workspace: workspaceId, assignedTo: userId }
    : { workspace: workspaceId };

  const [
    leadStageAgg,
    openLeadCount,
    wonThisMonth,
    pipelineValueAgg,
    customerCount,
    newCustomersThisMonth,
    quotationStatusAgg,
    quotationValueAgg,
    recentLeadsForActivity,
    topQuotations,
  ] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: baseLeadAgg },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({ ...baseLeadFilter, stage: { $in: OPEN_LEAD_STAGES } }),
    Lead.countDocuments({
      ...baseLeadFilter,
      stage: "won",
      updatedAt: { $gte: monthStart },
    }),
    Lead.aggregate<{ total: number }>([
      {
        $match: {
          ...baseLeadAgg,
          stage: { $in: OPEN_LEAD_STAGES },
        },
      },
      { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
    ]),
    Customer.countDocuments(baseCustomerFilter),
    Customer.countDocuments({
      ...baseCustomerFilter,
      createdAt: { $gte: monthStart },
    }),
    Quotation.aggregate<{ _id: string; count: number }>([
      { $match: mineOnly ? { workspace: wsObj, $or: [{ createdBy: userObj }, { assignedTo: userObj }] } : { workspace: wsObj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Quotation.aggregate<{ total: number }>([
      {
        $match: {
          ...(mineOnly
            ? { workspace: wsObj, $or: [{ createdBy: userObj }, { assignedTo: userObj }] }
            : { workspace: wsObj }),
          createdAt: { $gte: monthStart },
          currency: "INR",
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Lead.find(baseLeadFilter)
      .sort({ updatedAt: -1 })
      .limit(20)
      .select({ name: 1, company: 1, activity: 1 })
      .lean(),
    Quotation.find(baseQuoteFilter)
      .sort({ updatedAt: -1 })
      .limit(6)
      .select({ number: 1, recipient: 1, total: 1, currency: 1, status: 1, issueDate: 1 })
      .lean(),
  ]);

  const pipelineValue = pipelineValueAgg[0]?.total ?? 0;
  const quotationValue = quotationValueAgg[0]?.total ?? 0;
  const leadStageMap = new Map(leadStageAgg.map((r) => [r._id, r.count] as const));
  const quoteStatusMap = new Map(
    quotationStatusAgg.map((r) => [r._id, r.count] as const),
  );

  const tiles: StatTile[] = [
    {
      label: mineOnly ? "My pipeline (INR)" : "Pipeline value (INR)",
      value: formatCurrency(pipelineValue, "INR"),
      hint: `${openLeadCount} open lead${openLeadCount === 1 ? "" : "s"}`,
      icon: TrendingUp,
      accent: "from-violet-500 to-purple-700",
      href: `/workspace/${workspaceId}/leads`,
    },
    {
      label: mineOnly ? "My quotations (mo, INR)" : "Quotations (mo, INR)",
      value: formatCurrency(quotationValue, "INR"),
      hint: "Created this month",
      icon: FileSpreadsheet,
      accent: "from-blue-500 to-indigo-700",
      href: `/workspace/${workspaceId}/quotations`,
    },
    {
      label: mineOnly ? "My customers" : "Customers",
      value: String(customerCount),
      hint: `${newCustomersThisMonth} new this month`,
      icon: Users,
      accent: "from-emerald-500 to-teal-700",
      href: `/workspace/${workspaceId}/customers`,
    },
    {
      label: "Won this month",
      value: String(wonThisMonth),
      hint: mineOnly ? "Leads you closed" : "Leads closed by team",
      icon: Award,
      accent: "from-amber-500 to-orange-700",
      href: `/workspace/${workspaceId}/leads?status=won`,
    },
  ];

  const activityRows = buildLeadActivity(
    recentLeadsForActivity as unknown as LeanLeadActivity[],
    15,
  );

  return (
    <>
      <StatGrid tiles={tiles} />

      <SecondaryStatStrip
        items={[
          {
            label: "Drafts",
            value: String(quoteStatusMap.get("draft") ?? 0),
            icon: FileSpreadsheet,
          },
          {
            label: "Sent",
            value: String(quoteStatusMap.get("sent") ?? 0),
            icon: FileSpreadsheet,
          },
          {
            label: "Accepted",
            value: String(quoteStatusMap.get("accepted") ?? 0),
            icon: Award,
          },
          {
            label: "New customers (mo)",
            value: String(newCustomersThisMonth),
            icon: UserPlus,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            icon={Activity}
            title={mineOnly ? "Your recent lead activity" : "Recent lead activity"}
            subtitle="Latest moves on the pipeline"
            accent="from-primary to-secondary"
            actionLabel="Open leads"
            actionHref={`/workspace/${workspaceId}/leads`}
          >
            <ActivityFeed rows={activityRows} />
          </SectionCard>
        </div>
        <div className="lg:col-span-2">
          <SectionCard
            icon={Layers}
            title="Pipeline by stage"
            subtitle={
              mineOnly
                ? `${openLeadCount} of yours, open`
                : `${openLeadCount} open, team-wide`
            }
            accent="from-violet-500 to-purple-700"
            actionLabel="Open leads"
            actionHref={`/workspace/${workspaceId}/leads`}
          >
            <DistributionList
              rows={LEAD_STAGES.map((s) => ({
                label: LEAD_STAGE_LABEL[s],
                count: leadStageMap.get(s) ?? 0,
                color: LEAD_STAGE_DOT_COLOR_OVERRIDE[s] ?? "bg-zinc-400",
              }))}
              empty="No leads yet."
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard
        icon={FileSpreadsheet}
        title={mineOnly ? "Your recent quotations" : "Recent quotations"}
        subtitle="Latest in this workspace"
        accent="from-blue-500 to-indigo-700"
        actionLabel="Open quotations"
        actionHref={`/workspace/${workspaceId}/quotations`}
      >
        {topQuotations.length === 0 ? (
          <EmptyRow>No quotations yet.</EmptyRow>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(
              topQuotations as unknown as Array<{
                _id: { toString(): string };
                number: string;
                recipient: { name: string; company?: string };
                total: number;
                currency: string;
                status: string;
                issueDate: Date;
              }>
            ).map((q) => (
              <li
                key={q._id.toString()}
                className="flex items-start gap-3 px-5 py-3 text-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {q.number}
                  </p>
                  <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {q.recipient.name}
                    {q.recipient.company ? (
                      <span className="ml-1 text-zinc-500 dark:text-zinc-400">
                        · {q.recipient.company}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {format(new Date(q.issueDate), "MMM d, yyyy")} ·{" "}
                    <span className="capitalize">{q.status}</span> · updated{" "}
                    {timeAgo(new Date(q.issueDate))}
                  </p>
                </div>
                <Link
                  href={`/workspace/${workspaceId}/quotations/${q._id.toString()}/edit`}
                  className="text-right"
                >
                  <span className="block text-[14px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {formatCurrency(q.total, q.currency)}
                  </span>
                  <span className="block text-[10.5px] text-zinc-400 dark:text-zinc-500">
                    open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

function buildLeadActivity(
  leads: LeanLeadActivity[],
  limit: number,
): Array<{
  id: string;
  who: string;
  action: string;
  target: string;
  detail?: string;
  at: Date;
}> {
  const rows: Array<{
    id: string;
    who: string;
    action: string;
    target: string;
    detail?: string;
    at: Date;
  }> = [];
  for (const l of leads) {
    for (const a of l.activity ?? []) {
      rows.push({
        id: `lead-${l._id.toString()}-${a.at.toISOString()}-${a.type}`,
        who: "Someone",
        action: actionLabel(a.type),
        target: l.name,
        detail: l.company,
        at: new Date(a.at),
      });
    }
  }
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

function actionLabel(type: string): string {
  switch (type) {
    case "created":
      return "added lead";
    case "stage_changed":
      return "moved";
    case "converted_to_customer":
      return "converted";
    case "quotation_created":
      return "quoted";
    case "note_added":
      return "noted on";
    default:
      return "updated";
  }
}
