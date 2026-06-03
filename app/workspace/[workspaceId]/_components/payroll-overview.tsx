import {
  BadgeIndianRupee,
  CalendarClock,
  Users2,
  Wallet,
} from "lucide-react";
import Employee, { type IEmployee } from "@/models/employee";
import PayrollRun, { type IPayrollRun } from "@/models/payroll-run";
import {
  EMPLOYEE_STATUS_LABEL,
  PAYROLL_RUN_STATUS_BADGE_CLASS,
  PAYROLL_RUN_STATUS_LABEL,
  formatPeriod,
  type PayrollRunStatus,
} from "@/lib/payroll";
import { formatCurrency } from "@/lib/voucher";
import { cn } from "@/lib/cn";
import {
  DistributionList,
  EmptyRow,
  SectionCard,
  type StatTile,
} from "./overview-widgets";
import { SecondaryStatStrip, StatGrid } from "./executive-overview";

type LeanEmployee = IEmployee & { _id: { toString(): string } };
type LeanRun = IPayrollRun & { _id: { toString(): string } };

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  on_leave: "bg-amber-500",
  terminated: "bg-rose-500",
};

export default async function PayrollOverview({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [employees, runs] = await Promise.all([
    Employee.find({ workspace: workspaceId })
      .select("status department currency monthlyCtc")
      .lean() as unknown as Promise<LeanEmployee[]>,
    PayrollRun.find({ workspace: workspaceId })
      .sort({ periodYear: -1, periodMonth: -1, updatedAt: -1 })
      .limit(60)
      .lean() as unknown as Promise<LeanRun[]>,
  ]);

  const active = employees.filter((e) => e.status === "active");
  const onLeave = employees.filter((e) => e.status === "on_leave").length;
  const terminated = employees.filter((e) => e.status === "terminated").length;

  // Monthly payroll = sum of active employees' monthly CTC. Mixed currencies
  // are rare here; report the dominant currency total and label it.
  const ctcByCurrency = new Map<string, number>();
  for (const e of active) {
    ctcByCurrency.set(
      e.currency,
      (ctcByCurrency.get(e.currency) ?? 0) + (e.monthlyCtc ?? 0),
    );
  }
  const topCurrency =
    [...ctcByCurrency.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["INR", 0];

  const thisMonthRun = runs.find(
    (r) => r.periodMonth === month && r.periodYear === year,
  );
  const runsThisYear = runs.filter((r) => r.periodYear === year).length;
  const draftRuns = runs.filter((r) => r.status === "draft").length;
  const approvedRuns = runs.filter((r) => r.status === "approved").length;
  const paidThisYear = runs.filter(
    (r) => r.status === "paid" && r.periodYear === year,
  ).length;

  const tiles: StatTile[] = [
    {
      label: "Active employees",
      value: String(active.length),
      hint: `${employees.length} total on file`,
      icon: Users2,
      accent: "from-violet-500 to-purple-700",
      href: `/workspace/${workspaceId}/employees`,
    },
    {
      label: `Monthly payroll (${topCurrency[0]})`,
      value: formatCurrency(topCurrency[1], topCurrency[0]),
      hint: "Active employees' CTC",
      icon: BadgeIndianRupee,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: "This month's run",
      value: thisMonthRun
        ? formatCurrency(thisMonthRun.netTotal, thisMonthRun.currency)
        : "Not generated",
      hint: formatPeriod(month, year),
      icon: Wallet,
      accent: "from-blue-500 to-indigo-700",
      href: thisMonthRun
        ? `/workspace/${workspaceId}/payroll/${thisMonthRun._id.toString()}`
        : `/workspace/${workspaceId}/payroll/new`,
    },
    {
      label: "Runs this year",
      value: String(runsThisYear),
      hint: String(year),
      icon: CalendarClock,
      accent: "from-amber-500 to-orange-600",
    },
  ];

  // Department distribution (top 6 + Other).
  const deptCounts = new Map<string, number>();
  for (const e of employees) {
    const key = e.department?.trim() || "Unassigned";
    deptCounts.set(key, (deptCounts.get(key) ?? 0) + 1);
  }
  const deptSorted = [...deptCounts.entries()].sort((a, b) => b[1] - a[1]);
  const deptTop = deptSorted.slice(0, 6);
  const deptOther = deptSorted.slice(6).reduce((s, [, n]) => s + n, 0);
  const DEPT_DOTS = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
  ];

  return (
    <div className="space-y-4">
      <StatGrid tiles={tiles} />

      <SecondaryStatStrip
        items={[
          { label: "Draft runs", value: String(draftRuns), icon: Wallet },
          { label: "Awaiting payment", value: String(approvedRuns), icon: Wallet },
          { label: "Paid this year", value: String(paidThisYear), icon: BadgeIndianRupee },
          { label: "Terminated", value: String(terminated), icon: Users2 },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionCard
            icon={Users2}
            title="Employee status"
            subtitle="Headcount by status"
            accent="from-violet-500 to-purple-700"
          >
            <DistributionList
              rows={[
                {
                  label: EMPLOYEE_STATUS_LABEL.active,
                  count: active.length,
                  color: STATUS_DOT.active,
                },
                {
                  label: EMPLOYEE_STATUS_LABEL.on_leave,
                  count: onLeave,
                  color: STATUS_DOT.on_leave,
                },
                {
                  label: EMPLOYEE_STATUS_LABEL.terminated,
                  count: terminated,
                  color: STATUS_DOT.terminated,
                },
              ]}
              empty="No employees yet."
            />
          </SectionCard>
        </div>

        <div className="lg:col-span-3">
          <SectionCard
            icon={Wallet}
            title="Recent payroll runs"
            subtitle="Latest monthly runs"
            accent="from-emerald-500 to-teal-600"
            actionLabel="Open payroll"
            actionHref={`/workspace/${workspaceId}/payroll`}
          >
            {runs.length === 0 ? (
              <EmptyRow>No payroll runs yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {runs.slice(0, 6).map((r) => {
                  const status = r.status as PayrollRunStatus;
                  return (
                    <li
                      key={r._id.toString()}
                      className="flex items-center gap-3 px-5 py-3 text-[13px]"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {formatPeriod(r.periodMonth, r.periodYear)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                          PAYROLL_RUN_STATUS_BADGE_CLASS[status],
                        )}
                      >
                        {PAYROLL_RUN_STATUS_LABEL[status]}
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
                        {formatCurrency(r.netTotal, r.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {deptTop.length > 0 ? (
        <SectionCard
          icon={Users2}
          title="Departments"
          subtitle="Employees by department"
          accent="from-blue-500 to-indigo-700"
        >
          <DistributionList
            rows={[
              ...deptTop.map(([label, count], i) => ({
                label,
                count,
                color: DEPT_DOTS[i % DEPT_DOTS.length],
              })),
              ...(deptOther > 0
                ? [{ label: "Other", count: deptOther, color: "bg-zinc-400" }]
                : []),
            ]}
            empty="No departments yet."
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
