import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Users2, Wallet } from "lucide-react";
import PayrollRun, {
  PAYROLL_RUN_STATUS_BADGE_CLASS,
  PAYROLL_RUN_STATUS_LABEL,
  type IPayrollRun,
  type PayrollRunStatus,
} from "@/models/payroll-run";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PAYROLL_MANAGER_ROLES,
  canManagePayroll,
  formatPeriod,
} from "@/lib/payroll";
import { formatCurrency } from "@/lib/voucher";
import { cn } from "@/lib/cn";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";

export const metadata: Metadata = {
  title: "Payroll — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

type LeanRun = IPayrollRun & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export default async function PayrollPage({ params }: Props) {
  const { workspaceId } = await params;

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PAYROLL_MANAGER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const runsRaw = (await PayrollRun.find({ workspace: workspaceId })
    .sort({ periodYear: -1, periodMonth: -1, updatedAt: -1 })
    .limit(200)
    .lean()) as unknown as LeanRun[];

  const [draftCount, approvedCount] = await Promise.all([
    PayrollRun.countDocuments({ workspace: workspaceId, status: "draft" }),
    PayrollRun.countDocuments({ workspace: workspaceId, status: "approved" }),
  ]);

  const canManage = canManagePayroll(role);

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
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <Wallet className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  HR & Payroll
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Payroll
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Monthly payroll runs and the payslips they generate for{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            {canManage ? (
              <Link href={`/workspace/${workspace.id}/payroll/new`}>
                <Button type="button" variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New run
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total runs" value={runsRaw.length} accent="from-primary to-secondary" />
          <StatCard label="Drafts" value={draftCount} accent="from-zinc-500 to-zinc-700" />
          <StatCard label="Awaiting payment" value={approvedCount} accent="from-sky-500 to-indigo-600" />
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              {runsRaw.length} {runsRaw.length === 1 ? "run" : "runs"}
            </h2>
          </div>

          {runsRaw.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
                <Wallet className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                No payroll runs yet.
              </p>
              <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                {canManage ? (
                  <>
                    Add{" "}
                    <Link
                      href={`/workspace/${workspace.id}/employees`}
                      className="text-primary hover:underline"
                    >
                      employees
                    </Link>{" "}
                    first, then start a monthly run.
                  </>
                ) : (
                  "Payroll runs will appear here once HR creates them."
                )}
              </p>
              {canManage ? (
                <div className="mt-5">
                  <Link href={`/workspace/${workspace.id}/payroll/new`}>
                    <Button type="button" variant="primary" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      New run
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {runsRaw.map((r) => {
                const id = r._id.toString();
                const status = r.status as PayrollRunStatus;
                return (
                  <li key={id}>
                    <Link
                      href={`/workspace/${workspace.id}/payroll/${id}`}
                      className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm">
                        <Wallet className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatPeriod(r.periodMonth, r.periodYear)}
                          </p>
                          <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                            {r.number}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Users2 className="h-3 w-3" />
                            {r.employeeCount}{" "}
                            {r.employeeCount === 1 ? "payslip" : "payslips"}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(r.netTotal, r.currency)}
                          </p>
                          <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            net
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                            PAYROLL_RUN_STATUS_BADGE_CLASS[status],
                          )}
                        >
                          {PAYROLL_RUN_STATUS_LABEL[status]}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                      </div>
                    </Link>
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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl ${accent}`}
      />
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
