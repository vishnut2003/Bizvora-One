import {
  Activity,
  AlertTriangle,
  Banknote,
  Briefcase,
  Building2,
  FileSpreadsheet,
  FolderKanban,
  Layers,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import mongoose from "mongoose";
import Lead, { type ILead } from "@/models/lead";
import Customer, { type ICustomer } from "@/models/customer";
import Quotation from "@/models/quotation";
import SalesInvoice from "@/models/sales-invoice";
import PurchaseInvoice from "@/models/purchase-invoice";
import Receipt_ from "@/models/receipt";
import Project from "@/models/project";
import Vendor from "@/models/vendor";
import {
  LEAD_STAGE_DOT_COLOR_OVERRIDE,
} from "./overview-style";
import { LEAD_STAGES, LEAD_STAGE_LABEL, OPEN_LEAD_STAGES } from "@/lib/lead";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_DOT_CLASS,
  CUSTOMER_STATUS_LABEL,
} from "@/lib/customer";
import { formatCurrency } from "@/lib/voucher";
import { timeAgo } from "@/lib/time";
import {
  DistributionList,
  EmptyRow,
  SectionCard,
  StatTileCard,
  type StatTile,
} from "./overview-widgets";

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

type LeanCustomerActivity = ICustomer & {
  _id: { toString(): string };
  activity?: LeanActivity[];
};

type ActivityRow = {
  id: string;
  who: string;
  action: string;
  target: string;
  detail?: string;
  at: Date;
};

export default async function ExecutiveOverview({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    leadStageAgg,
    openLeadCount,
    wonThisMonth,
    pipelineValueAgg,
    customerCount,
    newCustomersThisMonth,
    customerStatusAgg,
    activeProjectCount,
    quotationCountThisMonth,
    receivablesAgg,
    payablesAgg,
    collectedThisMonth,
    overdueInvoices,
    recentLeadsForActivity,
    recentCustomersForActivity,
    recentReceipts,
    vendorCount,
  ] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { workspace: wsObj } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({ workspace: workspaceId, stage: { $in: OPEN_LEAD_STAGES } }),
    Lead.countDocuments({
      workspace: workspaceId,
      stage: "won",
      updatedAt: { $gte: monthStart },
    }),
    Lead.aggregate<{ total: number }>([
      {
        $match: {
          workspace: wsObj,
          stage: { $in: OPEN_LEAD_STAGES },
        },
      },
      { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
    ]),
    Customer.countDocuments({ workspace: workspaceId }),
    Customer.countDocuments({
      workspace: workspaceId,
      createdAt: { $gte: monthStart },
    }),
    Customer.aggregate<{ _id: string; count: number }>([
      { $match: { workspace: wsObj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Project.countDocuments({
      workspace: workspaceId,
      status: { $in: ["planning", "active"] },
    }),
    Quotation.countDocuments({
      workspace: workspaceId,
      createdAt: { $gte: monthStart },
    }),
    SalesInvoice.aggregate<{ owed: number }>([
      {
        $match: {
          workspace: wsObj,
          status: { $in: ["unpaid", "partial", "overdue"] },
          currency: "INR",
        },
      },
      {
        $group: {
          _id: null,
          owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
        },
      },
    ]),
    PurchaseInvoice.aggregate<{ owed: number }>([
      {
        $match: {
          workspace: wsObj,
          status: { $in: ["unpaid", "partial", "overdue"] },
          currency: "INR",
        },
      },
      {
        $group: {
          _id: null,
          owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
        },
      },
    ]),
    Receipt_.aggregate<{ total: number }>([
      {
        $match: {
          workspace: wsObj,
          status: "cleared",
          currency: "INR",
          receiptDate: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    SalesInvoice.find({
      workspace: workspaceId,
      status: { $in: ["unpaid", "partial", "overdue"] },
      dueDate: { $lt: today },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .select({ number: 1, customer: 1, total: 1, amountPaid: 1, currency: 1, dueDate: 1 })
      .lean(),
    Lead.find({ workspace: workspaceId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select({ name: 1, company: 1, activity: 1 })
      .lean(),
    Customer.find({ workspace: workspaceId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select({ name: 1, company: 1, activity: 1 })
      .lean(),
    Receipt_.find({ workspace: workspaceId, status: "cleared" })
      .sort({ receiptDate: -1 })
      .limit(5)
      .select({ number: 1, customer: 1, amount: 1, currency: 1, receiptDate: 1, paymentMode: 1 })
      .lean(),
    Vendor.countDocuments({ workspace: workspaceId }),
  ]);

  const pipelineValue = pipelineValueAgg[0]?.total ?? 0;
  const receivables = receivablesAgg[0]?.owed ?? 0;
  const payables = payablesAgg[0]?.owed ?? 0;
  const collected = collectedThisMonth[0]?.total ?? 0;

  // Build activity feed from lead/customer activity logs.
  const activityRows: ActivityRow[] = buildActivityFeed(
    recentLeadsForActivity as unknown as LeanLeadActivity[],
    recentCustomersForActivity as unknown as LeanCustomerActivity[],
    15,
  );

  const leadStageMap = new Map(
    leadStageAgg.map((r) => [r._id, r.count] as const),
  );
  const customerStatusMap = new Map(
    customerStatusAgg.map((r) => [r._id, r.count] as const),
  );

  const tiles: StatTile[] = [
    {
      label: "Pipeline value (INR)",
      value: formatCurrency(pipelineValue, "INR"),
      hint: `${openLeadCount} open leads`,
      icon: TrendingUp,
      accent: "from-violet-500 to-purple-700",
      href: `/workspace/${workspaceId}/leads`,
    },
    {
      label: "Receivable (INR)",
      value: formatCurrency(receivables, "INR"),
      hint: "From open invoices",
      icon: Banknote,
      accent: "from-emerald-500 to-teal-600",
      href: `/workspace/${workspaceId}/recovery`,
    },
    {
      label: "Payable (INR)",
      value: formatCurrency(payables, "INR"),
      hint: "Owed to vendors",
      icon: Wallet,
      accent: "from-rose-500 to-red-600",
      href: `/workspace/${workspaceId}/purchase-invoices`,
    },
    {
      label: "Active projects",
      value: String(activeProjectCount),
      hint: `${customerCount} customers · ${vendorCount} vendors`,
      icon: FolderKanban,
      accent: "from-blue-500 to-indigo-700",
      href: `/workspace/${workspaceId}/projects`,
    },
  ];

  return (
    <>
      <StatGrid tiles={tiles} />

      <SecondaryStatStrip
        items={[
          { label: "Won this month", value: String(wonThisMonth), icon: TrendingUp },
          { label: "New customers (mo)", value: String(newCustomersThisMonth), icon: UserPlus },
          { label: "Quotations (mo)", value: String(quotationCountThisMonth), icon: FileSpreadsheet },
          { label: "Collected (mo, INR)", value: formatCurrency(collected, "INR"), icon: Receipt },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            icon={Activity}
            title="Recent activity"
            subtitle="Latest moves across leads, customers, and quotations"
            accent="from-primary to-secondary"
          >
            <ActivityFeed rows={activityRows} />
          </SectionCard>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            icon={Layers}
            title="Lead pipeline"
            subtitle={`${openLeadCount} open leads by stage`}
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

          <SectionCard
            icon={Users}
            title="Customer status"
            subtitle={`${customerCount} customers total`}
            accent="from-emerald-500 to-teal-600"
            actionLabel="Open customers"
            actionHref={`/workspace/${workspaceId}/customers`}
          >
            <DistributionList
              rows={CUSTOMER_STATUSES.map((s) => ({
                label: CUSTOMER_STATUS_LABEL[s],
                count: customerStatusMap.get(s) ?? 0,
                color: CUSTOMER_STATUS_DOT_CLASS[s],
              }))}
              empty="No customers yet."
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          icon={AlertTriangle}
          title="Top overdue invoices"
          subtitle="Oldest first — chase these"
          accent="from-rose-500 to-red-600"
          actionLabel="Open recovery"
          actionHref={`/workspace/${workspaceId}/recovery`}
        >
          {overdueInvoices.length === 0 ? (
            <EmptyRow>No overdue invoices — well done!</EmptyRow>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                overdueInvoices as unknown as Array<{
                  _id: { toString(): string };
                  number: string;
                  customer: { name: string; company?: string };
                  total: number;
                  amountPaid: number;
                  currency: string;
                  dueDate: Date;
                }>
              ).map((inv) => {
                const balance = Math.max(0, inv.total - (inv.amountPaid ?? 0));
                const daysOverdue = Math.round(
                  (today.getTime() - new Date(inv.dueDate).getTime()) /
                    86_400_000,
                );
                return (
                  <li
                    key={inv._id.toString()}
                    className="flex items-start gap-3 px-5 py-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {inv.number}
                      </p>
                      <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {inv.customer.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                        {daysOverdue} day{daysOverdue === 1 ? "" : "s"} overdue
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="block text-[14px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatCurrency(balance, inv.currency)}
                      </span>
                      <span className="block text-[10.5px] text-zinc-400 dark:text-zinc-500">
                        of {formatCurrency(inv.total, inv.currency)}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={Receipt}
          title="Recent receipts"
          subtitle="Money collected from customers"
          accent="from-emerald-500 to-teal-600"
          actionLabel="Open receipts"
          actionHref={`/workspace/${workspaceId}/receipts`}
        >
          {recentReceipts.length === 0 ? (
            <EmptyRow>No receipts yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                recentReceipts as unknown as Array<{
                  _id: { toString(): string };
                  number: string;
                  customer: { name: string };
                  amount: number;
                  currency: string;
                  receiptDate: Date;
                  paymentMode: string;
                }>
              ).map((r) => (
                <li
                  key={r._id.toString()}
                  className="flex items-start gap-3 px-5 py-3 text-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {r.number}
                    </p>
                    <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {r.customer.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {format(new Date(r.receiptDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-right text-[14px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(r.amount, r.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

export function StatGrid({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <StatTileCard key={t.label} tile={t} />
      ))}
    </div>
  );
}

export function SecondaryStatStrip({
  items,
}: {
  items: Array<{ label: string; value: string; icon: typeof Briefcase }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-white p-3 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10.5px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {it.label}
              </p>
              <p className="truncate text-[14px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                {it.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildActivityFeed(
  leads: LeanLeadActivity[],
  customers: LeanCustomerActivity[],
  limit: number,
): ActivityRow[] {
  const rows: ActivityRow[] = [];
  for (const l of leads) {
    for (const a of l.activity ?? []) {
      rows.push({
        id: `lead-${l._id.toString()}-${a.at.toISOString()}-${a.type}`,
        who: "Someone",
        action: leadActionLabel(a.type),
        target: l.name,
        detail: l.company,
        at: new Date(a.at),
      });
    }
  }
  for (const c of customers) {
    for (const a of c.activity ?? []) {
      rows.push({
        id: `cust-${c._id.toString()}-${a.at.toISOString()}-${a.type}`,
        who: "Someone",
        action: customerActionLabel(a.type),
        target: c.name,
        detail: c.company,
        at: new Date(a.at),
      });
    }
  }
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

function leadActionLabel(type: string): string {
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
function customerActionLabel(type: string): string {
  switch (type) {
    case "created":
      return "added customer";
    case "status_changed":
      return "changed status of";
    case "project_linked":
      return "linked a project to";
    case "quotation_created":
      return "quoted";
    case "note_added":
      return "noted on";
    default:
      return "updated";
  }
}

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyRow>
        Nothing&apos;s moved yet. Once leads and customers see action, it&apos;ll
        appear here.
      </EmptyRow>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {rows.map((event) => (
        <li
          key={event.id}
          className="flex items-start gap-3 px-5 py-3 text-[13px]"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-zinc-700 dark:text-zinc-300">
              {event.action}{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {event.target}
              </span>
              {event.detail ? (
                <span className="text-zinc-500 dark:text-zinc-400">
                  {" "}
                  · <Building2 className="inline h-3 w-3" /> {event.detail}
                </span>
              ) : null}
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
            {timeAgo(event.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
