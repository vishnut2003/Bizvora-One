import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Pencil,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import PayrollRun, {
  type IPayrollRun,
  type PayrollRunStatus,
} from "@/models/payroll-run";
import Payslip, { type IPayslip } from "@/models/payslip";
import Employee, { type IEmployee } from "@/models/employee";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PAYROLL_MANAGER_ROLES,
  PAYROLL_RUN_STATUS_BADGE_CLASS,
  PAYROLL_RUN_STATUS_LABEL,
  canManagePayroll,
  formatPeriod,
} from "@/lib/payroll";
import { formatCurrency } from "@/lib/voucher";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";
import RunStatusActions from "../_components/run-status-actions";
import RemovePayslipButton from "../_components/remove-payslip-button";
import AddPayslipControl, {
  type AddCandidate,
} from "../_components/add-payslip-control";

export const metadata: Metadata = {
  title: "Payroll Run — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; runId: string }>;
};

type LeanRun = IPayrollRun & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};
type LeanPayslip = IPayslip & { _id: { toString(): string } };
type LeanEmployee = IEmployee & { _id: { toString(): string } };

export default async function PayrollRunPage({ params }: Props) {
  const { workspaceId, runId } = await params;
  if (!mongoose.Types.ObjectId.isValid(runId)) notFound();

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PAYROLL_MANAGER_ROLES,
  });

  const run = (await PayrollRun.findOne({
    _id: runId,
    workspace: workspaceId,
  }).lean()) as LeanRun | null;
  if (!run) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const payslips = (await Payslip.find({ run: runId })
    .sort({ "employeeSnapshot.name": 1 })
    .lean()) as unknown as LeanPayslip[];

  const status = run.status as PayrollRunStatus;
  const isDraft = status === "draft";
  const canManage = canManagePayroll(role);

  // Active employees not yet in this run, matching the run currency — offered
  // for the draft "add employee" control.
  let addCandidates: AddCandidate[] = [];
  if (isDraft && canManage) {
    const inRun = new Set(payslips.map((p) => String(p.employee)));
    const actives = (await Employee.find({
      workspace: workspaceId,
      status: "active",
      currency: run.currency,
    })
      .select("name empId")
      .sort({ name: 1 })
      .lean()) as unknown as LeanEmployee[];
    addCandidates = actives
      .filter((e) => !inRun.has(e._id.toString()))
      .map((e) => ({ id: e._id.toString(), name: e.name, empId: e.empId }));
  }

  const base = `/workspace/${workspace.id}/payroll`;

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={base}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Payroll
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                    {formatPeriod(run.periodMonth, run.periodYear)}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                      PAYROLL_RUN_STATUS_BADGE_CLASS[status],
                    )}
                  >
                    {PAYROLL_RUN_STATUS_LABEL[status]}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[12px] text-zinc-500 dark:text-zinc-400">
                  {run.number}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  {run.approvedOn ? (
                    <span>
                      Approved {format(new Date(run.approvedOn), "MMM d, yyyy")}
                    </span>
                  ) : null}
                  {run.paidOn ? (
                    <span>
                      Paid {format(new Date(run.paidOn), "MMM d, yyyy")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {canManage ? (
              <RunStatusActions
                workspaceId={workspace.id}
                runId={runId}
                status={status}
                payslipCount={payslips.length}
              />
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TotalCard label="Payslips" value={String(run.employeeCount)} />
          <TotalCard label="Gross" value={formatCurrency(run.grossTotal, run.currency)} />
          <TotalCard label="Deductions" value={formatCurrency(run.deductionTotal, run.currency)} />
          <TotalCard label="Net" value={formatCurrency(run.netTotal, run.currency)} highlight />
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              Payslips
            </h2>
            {isDraft && canManage ? (
              <AddPayslipControl
                workspaceId={workspace.id}
                runId={runId}
                candidates={addCandidates}
              />
            ) : null}
          </div>

          {payslips.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
              No payslips in this run.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payslips.map((p) => {
                const id = p._id.toString();
                const zeroPay = p.gross === 0;
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-[13px] font-semibold text-white shadow-sm">
                      {p.employeeSnapshot.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="truncate text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {p.employeeSnapshot.name}
                        </p>
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                          {p.employeeSnapshot.empId}
                        </span>
                        {zeroPay ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            <TriangleAlert className="h-3 w-3" />
                            No salary
                          </span>
                        ) : null}
                      </div>
                      {p.employeeSnapshot.designation ? (
                        <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                          {p.employeeSnapshot.designation}
                        </p>
                      ) : null}
                    </div>
                    <div className="hidden gap-6 text-right sm:flex">
                      <Figure label="Gross" value={formatCurrency(p.gross, p.currency)} />
                      <Figure label="Deductions" value={formatCurrency(p.totalDeductions, p.currency)} />
                      <Figure label="Net" value={formatCurrency(p.net, p.currency)} strong />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link href={`${base}/${runId}/payslips/${id}/pdf`}>
                        <Button type="button" variant="ghost" size="sm">
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </Link>
                      {isDraft && canManage ? (
                        <>
                          <Link
                            href={`${base}/${runId}/payslips/${id}/edit`}
                          >
                            <Button type="button" variant="secondary" size="sm">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          </Link>
                          <RemovePayslipButton
                            workspaceId={workspace.id}
                            runId={runId}
                            payslipId={id}
                            employeeName={p.employeeSnapshot.name}
                          />
                        </>
                      ) : null}
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

function TotalCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-[18px] font-semibold tabular-nums tracking-tight",
          highlight ? "text-primary" : "text-zinc-900 dark:text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Figure({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "text-[12.5px] tabular-nums",
          strong
            ? "font-semibold text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 dark:text-zinc-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}
