import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import PayrollRun, { type IPayrollRun } from "@/models/payroll-run";
import Payslip, { type IPayslip } from "@/models/payslip";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PAYROLL_MANAGER_ROLES, formatPeriod } from "@/lib/payroll";
import DashboardLayout from "@/layouts/dashboard-layout";
import PayslipForm from "../../../_components/payslip-form";

export const metadata: Metadata = {
  title: "Edit Payslip — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; runId: string; payslipId: string }>;
};

type LeanRun = IPayrollRun & { _id: { toString(): string } };
type LeanPayslip = IPayslip & { _id: { toString(): string } };

export default async function EditPayslipPage({ params }: Props) {
  const { workspaceId, runId, payslipId } = await params;
  if (
    !mongoose.Types.ObjectId.isValid(runId) ||
    !mongoose.Types.ObjectId.isValid(payslipId)
  ) {
    notFound();
  }

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

  // Payslips are only editable while the run is a draft.
  if (run.status !== "draft") {
    redirect(`/workspace/${workspaceId}/payroll/${runId}`);
  }

  const payslip = (await Payslip.findOne({
    _id: payslipId,
    run: runId,
  }).lean()) as LeanPayslip | null;
  if (!payslip) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const baseEarnings = (payslip.earnings ?? []).map((l) => ({
    label: l.label,
    amount: l.amount,
  }));
  const baseDeductions = (payslip.deductions ?? []).map((l) => ({
    label: l.label,
    amount: l.amount,
  }));
  const adjustments = {
    earnings: (payslip.adjustments?.earnings ?? []).map((l) => ({
      label: l.label,
      amount: l.amount,
    })),
    deductions: (payslip.adjustments?.deductions ?? []).map((l) => ({
      label: l.label,
      amount: l.amount,
    })),
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${workspace.id}/payroll/${runId}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {formatPeriod(run.periodMonth, run.periodYear)}
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              {payslip.employeeSnapshot.name}
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {payslip.employeeSnapshot.empId} ·{" "}
              {formatPeriod(run.periodMonth, run.periodYear)}
            </p>
          </div>
        </div>

        <PayslipForm
          workspaceId={workspace.id}
          runId={runId}
          payslipId={String(payslip._id)}
          employeeName={payslip.employeeSnapshot.name}
          currency={payslip.currency}
          baseEarnings={baseEarnings}
          baseDeductions={baseDeductions}
          adjustments={adjustments}
          notes={payslip.notes ?? ""}
        />
      </div>
    </DashboardLayout>
  );
}
