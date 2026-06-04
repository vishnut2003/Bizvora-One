import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import Employee, { type IEmployee } from "@/models/employee";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import type { WorkspaceColor } from "@/lib/workspace";
import { PAYROLL_MANAGER_ROLES, computeTotals } from "@/lib/payroll";
import DashboardLayout from "@/layouts/dashboard-layout";
import RunForm, { type RunCandidate } from "../_components/run-form";

export const metadata: Metadata = {
  title: "New Payroll Run — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

type LeanEmployee = IEmployee & { _id: { toString(): string } };

export default async function NewPayrollRunPage({ params }: Props) {
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

  const employeesRaw = (await Employee.find({
    workspace: workspaceId,
    status: "active",
  })
    .sort({ name: 1 })
    .lean()) as unknown as LeanEmployee[];

  const candidates: RunCandidate[] = employeesRaw.map((e) => {
    const totals = computeTotals(
      (e.salaryStructure?.earnings ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
      (e.salaryStructure?.deductions ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
    );
    return {
      id: e._id.toString(),
      name: e.name,
      empId: e.empId,
      designation: e.designation ?? "",
      currency: e.currency ?? "INR",
      gross: totals.gross,
      net: totals.net,
    };
  });

  const now = new Date();

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${workspace.id}/payroll`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Payroll
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              New payroll run
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Pick a month and the employees to include. Each gets a payslip
              from their current salary structure.
            </p>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              No active employees.
            </p>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Add active employees before running payroll.
            </p>
            <div className="mt-5">
              <Link
                href={`/workspace/${workspace.id}/employees/new`}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Add an employee →
              </Link>
            </div>
          </div>
        ) : (
          <RunForm
            workspaceId={workspace.id}
            candidates={candidates}
            defaultMonth={now.getMonth() + 1}
            defaultYear={now.getFullYear()}
            defaultCurrency="INR"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
