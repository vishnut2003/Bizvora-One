import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import Employee, {
  type IEmployee,
  type EmployeeStatus,
  type EmploymentType,
} from "@/models/employee";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { EMPLOYEE_MANAGER_ROLES } from "@/lib/user";
import type { WorkspaceColor } from "@/lib/workspace";
import type { SalaryStructure } from "@/lib/payroll";
import DashboardLayout from "@/layouts/dashboard-layout";
import EmployeeForm from "../../_components/employee-form";
import { getLinkCandidates } from "../../_lib/link-candidates";

export const metadata: Metadata = {
  title: "Edit Employee — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; employeeId: string }>;
};

type LeanEmployee = IEmployee & { _id: { toString(): string } };

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditEmployeePage({ params }: Props) {
  const { workspaceId, employeeId } = await params;

  if (!mongoose.Types.ObjectId.isValid(employeeId)) notFound();

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: EMPLOYEE_MANAGER_ROLES,
  });

  const employee = (await Employee.findOne({
    _id: employeeId,
    workspace: workspaceId,
  }).lean()) as LeanEmployee | null;

  if (!employee) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const linkCandidates = await getLinkCandidates(doc);

  const defaults = {
    empId: employee.empId,
    name: employee.name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    employmentType: (employee.employmentType ?? "full_time") as EmploymentType,
    dateOfJoining: toDateInput(employee.dateOfJoining),
    status: (employee.status ?? "active") as EmployeeStatus,
    currency: employee.currency ?? "INR",
    linkedUser: employee.linkedUser ? String(employee.linkedUser) : null,
    salaryStructure: {
      earnings: (employee.salaryStructure?.earnings ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
      deductions: (employee.salaryStructure?.deductions ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
    } as SalaryStructure,
    notes: employee.notes ?? "",
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
            href={`/workspace/${workspace.id}/employees`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Employees
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Edit employee
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {employee.name} · {employee.empId}
            </p>
          </div>
        </div>

        <EmployeeForm
          mode="edit"
          workspaceId={workspace.id}
          employeeId={String(employee._id)}
          defaults={defaults}
          linkCandidates={linkCandidates}
        />
      </div>
    </DashboardLayout>
  );
}
