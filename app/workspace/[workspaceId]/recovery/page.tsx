import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import type { FilterQuery } from "mongoose";
import SalesInvoice, { type ISalesInvoice } from "@/models/sales-invoice";
import User from "@/models/user";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  VOUCHER_VIEWER_ROLES,
  canViewAllVouchers,
  formatCurrency,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";
import FollowUpButton from "./_components/follow-up-button";
import FollowUpHistoryPopup, {
  type FollowUpEntry,
} from "./_components/follow-up-history-popup";

export const metadata: Metadata = { title: "Recovery — BizvoraOne" };

type LeanInvoice = ISalesInvoice & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export default async function RecoveryPage({ params, searchParams }: Props) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VOUCHER_VIEWER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const filterByCustomerName = asString(sp.q)?.trim() ?? "";
  const bucket = asString(sp.bucket) ?? "all"; // all | overdue | due-soon

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const baseFilter: FilterQuery<ISalesInvoice> = canViewAllVouchers(role)
    ? { workspace: workspaceId }
    : {
        workspace: workspaceId,
        $or: [
          { createdBy: session.user.id },
          { assignedTo: session.user.id },
        ],
      };

  const filter: FilterQuery<ISalesInvoice> = {
    ...baseFilter,
    status: { $in: ["unpaid", "partial", "overdue"] },
  };

  if (bucket === "overdue") {
    filter.dueDate = { $lt: today };
  } else if (bucket === "due-soon") {
    filter.dueDate = { $gte: today, $lte: inSevenDays };
  }

  if (filterByCustomerName) {
    const re = new RegExp(
      filterByCustomerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [
          { number: re },
          { "customer.name": re },
          { "customer.company": re },
        ],
      },
    ];
  }

  const invoices = (await SalesInvoice.find(filter)
    .sort({ dueDate: 1, invoiceDate: 1 })
    .limit(500)
    .lean()) as unknown as LeanInvoice[];

  // Resolve follow-up author names in one round-trip.
  const followUpUserIds = Array.from(
    new Set(
      invoices.flatMap((inv) =>
        (inv.followUps ?? []).map((f) => String(f.by)),
      ),
    ),
  );
  const userMap = new Map<string, { name: string }>();
  if (followUpUserIds.length > 0) {
    const users = (await User.find({ _id: { $in: followUpUserIds } })
      .select({ name: 1, email: 1 })
      .lean()) as Array<{
      _id: { toString(): string };
      name?: string;
      email?: string;
    }>;
    for (const u of users) {
      userMap.set(String(u._id), {
        name: u.name ?? u.email ?? "Someone",
      });
    }
  }

  // Aggregate outstanding for the stat row (INR only).
  const totalOutstanding = invoices
    .filter((i) => i.currency === "INR")
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid ?? 0)), 0);
  const overdueINR = invoices
    .filter(
      (i) =>
        i.currency === "INR" &&
        i.dueDate &&
        new Date(i.dueDate) < today,
    )
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid ?? 0)), 0);
  const dueSoonINR = invoices
    .filter((i) => {
      if (i.currency !== "INR" || !i.dueDate) return false;
      const due = new Date(i.dueDate);
      return due >= today && due <= inSevenDays;
    })
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid ?? 0)), 0);

  // Group invoices by customer for the display.
  const groups = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      customerCompany: string;
      invoices: LeanInvoice[];
      outstanding: number;
      currency: string;
    }
  >();
  for (const inv of invoices) {
    const cid = String(inv.customer.refId ?? `_none_${inv.customer.name}`);
    if (!groups.has(cid)) {
      groups.set(cid, {
        customerId: inv.customer.refId ? String(inv.customer.refId) : "",
        customerName: inv.customer.name,
        customerCompany: inv.customer.company ?? "",
        invoices: [],
        outstanding: 0,
        currency: inv.currency,
      });
    }
    const g = groups.get(cid)!;
    g.invoices.push(inv);
    g.outstanding += Math.max(0, inv.total - (inv.amountPaid ?? 0));
  }
  const groupedList = Array.from(groups.values()).sort(
    (a, b) => b.outstanding - a.outstanding,
  );

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <RotateCcw className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Sales
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Recovery
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Open and overdue invoices grouped by customer, sorted by amount owed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatPill
            label="Outstanding (INR)"
            value={formatCurrency(totalOutstanding, "INR")}
            icon={Banknote}
            accent="from-primary to-secondary"
          />
          <StatPill
            label="Overdue (INR)"
            value={formatCurrency(overdueINR, "INR")}
            icon={AlertTriangle}
            accent="from-rose-500 to-red-600"
          />
          <StatPill
            label="Due within 7 days (INR)"
            value={formatCurrency(dueSoonINR, "INR")}
            icon={Clock}
            accent="from-amber-500 to-orange-600"
          />
        </div>

        <form className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="text"
            name="q"
            defaultValue={filterByCustomerName}
            placeholder="Search by invoice number, customer, or company…"
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <select
            name="bucket"
            defaultValue={bucket}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">All open</option>
            <option value="overdue">Overdue only</option>
            <option value="due-soon">Due within 7 days</option>
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {(filterByCustomerName || bucket !== "all") ? (
            <Link href={`/workspace/${workspace.id}/recovery`}>
              <Button type="button" variant="ghost" size="sm">
                Clear
              </Button>
            </Link>
          ) : null}
        </form>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-[16px] font-medium text-zinc-900 dark:text-zinc-100">
              Nothing to chase — all clear!
            </h2>
            <p className="mt-1.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              No open or overdue customer invoices match these filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedList.map((g) => (
              <div
                key={g.customerId || g.customerName}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-[13px] font-semibold text-white shadow-sm">
                      {g.customerName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {g.customerName}
                      </p>
                      {g.customerCompany ? (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                          <Building2 className="h-3 w-3" />
                          {g.customerCompany}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Outstanding
                    </p>
                    <p className="text-[18px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                      {formatCurrency(g.outstanding, g.currency)}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {g.invoices.map((inv) => {
                    const id = inv._id.toString();
                    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
                    const daysOverdue = dueDate ? daysBetween(today, dueDate) : 0;
                    const balance = Math.max(0, inv.total - (inv.amountPaid ?? 0));
                    const allFollowUps = inv.followUps ?? [];
                    const latestFollow = allFollowUps[allFollowUps.length - 1];
                    // Build a newest-first list for the history popup, with
                    // author names resolved against the bulk-fetched userMap.
                    const historyEntries: FollowUpEntry[] = [...allFollowUps]
                      .reverse()
                      .map((f) => ({
                        at: new Date(f.at).toISOString(),
                        byName:
                          userMap.get(String(f.by))?.name ?? "Someone",
                        note: f.note ?? "",
                      }));
                    return (
                      <li key={id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[12px] tracking-tight text-zinc-500 dark:text-zinc-400">
                              {inv.number}
                            </p>
                            <p className="mt-0.5 inline-flex items-center gap-3 text-[12px] text-zinc-500 dark:text-zinc-400">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Invoiced{" "}
                                {format(new Date(inv.invoiceDate), "MMM d, yyyy")}
                              </span>
                              {dueDate ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                                    daysOverdue > 0
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                      : daysOverdue >= -7
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                        : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                                  )}
                                >
                                  <Clock className="h-3 w-3" />
                                  Due {format(dueDate, "MMM d")}
                                  {daysOverdue > 0
                                    ? ` · ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`
                                    : daysOverdue === 0
                                      ? " · due today"
                                      : ` · in ${-daysOverdue} day${daysOverdue === -1 ? "" : "s"}`}
                                </span>
                              ) : (
                                <span className="italic">No due date</span>
                              )}
                            </p>
                            {latestFollow ? (
                              <p className="mt-2 rounded-md bg-zinc-50 px-2 py-1.5 text-[11.5px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                                <span className="font-medium">
                                  {userMap.get(String(latestFollow.by))?.name ?? "Someone"}
                                </span>{" "}
                                · {timeAgo(new Date(latestFollow.at))}
                                {latestFollow.note
                                  ? ` — ${latestFollow.note}`
                                  : ""}
                                <FollowUpHistoryPopup
                                  invoiceNumber={inv.number}
                                  entries={historyEntries}
                                  earlierCount={allFollowUps.length - 1}
                                />
                              </p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                              Total {formatCurrency(inv.total, inv.currency)}
                            </p>
                            <p className="text-[16px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                              {formatCurrency(balance, inv.currency)}
                            </p>
                            <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500">
                              outstanding
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {g.customerId ? (
                            <Link
                              href={`/workspace/${workspace.id}/receipts/new?customerId=${g.customerId}&invoiceId=${id}`}
                            >
                              <Button type="button" variant="primary" size="sm">
                                <Banknote className="h-3 w-3" />
                                Record receipt
                              </Button>
                            </Link>
                          ) : null}
                          <FollowUpButton
                            workspaceId={workspace.id}
                            invoiceId={id}
                            invoiceNumber={inv.number}
                            customerName={inv.customer.name}
                          />
                          <Link
                            href={`/workspace/${workspace.id}/sale-invoices/${id}/edit`}
                            className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            Open invoice →
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Banknote;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl ${accent}`}
      />
      <div className="relative flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <span
          className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${accent}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="relative mt-3 text-[20px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
