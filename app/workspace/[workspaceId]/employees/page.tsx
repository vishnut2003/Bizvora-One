import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Mail, Pencil, Phone, Plus, Users2 } from "lucide-react";
import type { FilterQuery } from "mongoose";
import Employee, {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_BADGE_CLASS,
  EMPLOYEE_STATUS_LABEL,
  type IEmployee,
  type EmployeeStatus,
} from "@/models/employee";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { EMPLOYEE_MANAGER_ROLES, canManageEmployees } from "@/lib/user";
import { formatCurrency, escapeRegex } from "@/lib/voucher";
import { cn } from "@/lib/cn";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";
import RemoveEmployeeButton from "./_components/remove-employee-button";

export const metadata: Metadata = {
  title: "Employees — BizvoraOne",
};

type EmployeesPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LeanEmployee = IEmployee & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function isEmployeeStatus(v: string): v is EmployeeStatus {
  return (EMPLOYEE_STATUSES as readonly string[]).includes(v);
}

export default async function EmployeesPage({
  params,
  searchParams,
}: EmployeesPageProps) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: EMPLOYEE_MANAGER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const q = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";

  const filter: FilterQuery<IEmployee> = { workspace: workspaceId };
  if (isEmployeeStatus(statusRaw)) filter.status = statusRaw;
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { name: re },
      { empId: re },
      { email: re },
      { designation: re },
      { department: re },
    ];
  }

  const employeesRaw = (await Employee.find(filter)
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean()) as unknown as LeanEmployee[];

  const [activeCount, onLeaveCount, terminatedCount] = await Promise.all([
    Employee.countDocuments({ workspace: workspaceId, status: "active" }),
    Employee.countDocuments({ workspace: workspaceId, status: "on_leave" }),
    Employee.countDocuments({ workspace: workspaceId, status: "terminated" }),
  ]);
  const total = activeCount + onLeaveCount + terminatedCount;

  const canManage = canManageEmployees(role);
  const filtersApplied = Boolean(q) || statusRaw !== "all";

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
                <Users2 className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  HR & Payroll
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Employees
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  The people on payroll in{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  . Separate from workspace login accounts.
                </p>
              </div>
            </div>
            {canManage ? (
              <Link href={`/workspace/${workspace.id}/employees/new`}>
                <Button type="button" variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New employee
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={total} accent="from-primary to-secondary" />
          <StatCard label="Active" value={activeCount} accent="from-emerald-500 to-teal-600" />
          <StatCard label="On leave" value={onLeaveCount} accent="from-amber-500 to-orange-600" />
          <StatCard label="Terminated" value={terminatedCount} accent="from-rose-500 to-red-600" />
        </div>

        <form className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name, ID, email, designation, or department…"
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <select
            name="status"
            defaultValue={statusRaw}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">All statuses</option>
            {EMPLOYEE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EMPLOYEE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {filtersApplied ? (
            <Link href={`/workspace/${workspace.id}/employees`}>
              <Button type="button" variant="ghost" size="sm">
                Clear
              </Button>
            </Link>
          ) : null}
        </form>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              {employeesRaw.length}{" "}
              {employeesRaw.length === 1 ? "employee" : "employees"}
            </h2>
          </div>

          {employeesRaw.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
                <Users2 className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                {filtersApplied
                  ? "No employees match these filters."
                  : "No employees yet."}
              </p>
              <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                {filtersApplied
                  ? "Clear filters or refine your search."
                  : canManage
                    ? "Add your first employee to start running payroll."
                    : "Employees will appear here once HR adds them."}
              </p>
              {!filtersApplied && canManage ? (
                <div className="mt-5">
                  <Link href={`/workspace/${workspace.id}/employees/new`}>
                    <Button type="button" variant="primary" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      New employee
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {employeesRaw.map((e) => {
                const id = e._id.toString();
                const status = e.status as EmployeeStatus;
                const meta = [e.designation, e.department]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-start gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-[14px] font-semibold text-white shadow-sm">
                      {e.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {e.name}
                        </p>
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                          {e.empId}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                        {meta ? (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {meta}
                          </span>
                        ) : null}
                        {e.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {e.email}
                          </span>
                        ) : null}
                        {e.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {e.phone}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="hidden text-right sm:block">
                        <p className="text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(e.monthlyCtc, e.currency)}
                        </p>
                        <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          monthly
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                          EMPLOYEE_STATUS_BADGE_CLASS[status],
                        )}
                      >
                        {EMPLOYEE_STATUS_LABEL[status]}
                      </span>
                      {canManage ? (
                        <>
                          <Link
                            href={`/workspace/${workspace.id}/employees/${id}/edit`}
                          >
                            <Button type="button" variant="secondary" size="sm">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          </Link>
                          <RemoveEmployeeButton
                            workspaceId={workspace.id}
                            employeeId={id}
                            employeeName={e.name}
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
