"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  CalendarClock,
  IdCard,
  Link2,
  type LucideIcon,
  UserCog,
} from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import { cn } from "@/lib/cn";
import { VOUCHER_CURRENCIES } from "@/lib/voucher";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABEL,
  EMPTY_SALARY_STRUCTURE,
  type EmployeeStatus,
  type EmploymentType,
  type SalaryStructure,
} from "@/lib/payroll";
import {
  createEmployee,
  updateEmployee,
  type EmployeeActionState,
} from "../actions";
import SalaryStructureEditor from "./salary-structure-editor";
import LinkedUserPicker, { type LinkableUser } from "./linked-user-picker";

export type EmployeeFormDefaults = {
  empId: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: EmploymentType;
  dateOfJoining: string; // yyyy-mm-dd or ""
  status: EmployeeStatus;
  currency: string;
  linkedUser: string | null;
  salaryStructure: SalaryStructure;
  notes: string;
};

export const EMPTY_EMPLOYEE_DEFAULTS: EmployeeFormDefaults = {
  empId: "",
  name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  employmentType: "full_time",
  dateOfJoining: "",
  status: "active",
  currency: "INR",
  linkedUser: null,
  salaryStructure: EMPTY_SALARY_STRUCTURE,
  notes: "",
};

type Props = {
  mode: "create" | "edit";
  workspaceId: string;
  employeeId?: string;
  defaults: EmployeeFormDefaults;
  linkCandidates: LinkableUser[];
};

const INITIAL_STATE: EmployeeActionState = {};
const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";
const selectClass =
  "mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

export default function EmployeeForm({
  mode,
  workspaceId,
  employeeId,
  defaults,
  linkCandidates,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<EmployeeStatus>(defaults.status);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    defaults.employmentType,
  );
  const [currency, setCurrency] = useState(defaults.currency);
  const [linkedUser, setLinkedUser] = useState<string | null>(
    defaults.linkedUser,
  );
  const [name, setName] = useState(defaults.name);
  const [email, setEmail] = useState(defaults.email);

  const [state, formAction, pending] = useActionState(
    (prev: EmployeeActionState, formData: FormData) =>
      mode === "create"
        ? createEmployee(workspaceId, prev, formData)
        : updateEmployee(workspaceId, employeeId!, prev, formData),
    INITIAL_STATE,
  );

  const errs = state.errors;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="status" value={status} readOnly />
      <input type="hidden" name="employmentType" value={employmentType} readOnly />
      <input type="hidden" name="currency" value={currency} readOnly />
      <input type="hidden" name="linkedUser" value={linkedUser ?? ""} readOnly />

      <Section
        icon={IdCard}
        title="Identity"
        subtitle="Who this employee is"
        accent="from-primary to-secondary"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="empId" className={labelClass}>
              Employee ID *
            </label>
            <Input
              id="empId"
              name="empId"
              required
              autoFocus={mode === "create"}
              maxLength={32}
              defaultValue={defaults.empId}
              placeholder="EMP-001"
              className="mt-2 font-mono uppercase tracking-tight"
            />
            {errs?.empId ? <FieldError>{errs.empId}</FieldError> : null}
          </div>
          <div>
            <label htmlFor="name" className={labelClass}>
              Full name *
            </label>
            <Input
              id="name"
              name="name"
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-2"
            />
            {errs?.name ? <FieldError>{errs.name}</FieldError> : null}
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-2"
            />
            {errs?.email ? <FieldError>{errs.email}</FieldError> : null}
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <Input
              id="phone"
              name="phone"
              defaultValue={defaults.phone}
              placeholder="+91 98765 43210"
              className="mt-2"
            />
            {errs?.phone ? <FieldError>{errs.phone}</FieldError> : null}
          </div>
        </div>
      </Section>

      <Section
        icon={UserCog}
        title="Role & employment"
        subtitle="Designation, department, and status"
        accent="from-blue-500 to-indigo-600"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="designation" className={labelClass}>
              Designation
            </label>
            <Input
              id="designation"
              name="designation"
              defaultValue={defaults.designation}
              placeholder="Software Engineer"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="department" className={labelClass}>
              Department
            </label>
            <Input
              id="department"
              name="department"
              defaultValue={defaults.department}
              placeholder="Engineering"
              className="mt-2"
            />
          </div>
          <div>
            <label className={labelClass}>Employment type</label>
            <select
              value={employmentType}
              onChange={(e) =>
                setEmploymentType(e.target.value as EmploymentType)
              }
              className={selectClass}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
              className={selectClass}
            >
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMPLOYEE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dateOfJoining" className={labelClass}>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Date of joining
              </span>
            </label>
            <Input
              id="dateOfJoining"
              name="dateOfJoining"
              type="date"
              defaultValue={defaults.dateOfJoining}
              className="mt-2"
            />
          </div>
        </div>
      </Section>

      <Section
        icon={Link2}
        title="Linked user"
        subtitle="Optionally associate an existing workspace account (metadata only — grants no access)"
        accent="from-violet-500 to-purple-600"
      >
        <LinkedUserPicker
          candidates={linkCandidates}
          value={linkedUser}
          onChange={(u) => {
            setLinkedUser(u?.id ?? null);
            if (u) {
              if (u.name) setName(u.name);
              if (u.email) setEmail(u.email);
            }
          }}
        />
      </Section>

      <Section
        icon={BadgeIndianRupee}
        title="Salary structure"
        subtitle="Itemized earnings and deductions — gross, deductions, and net are computed"
        accent="from-emerald-500 to-teal-600"
      >
        <div className="mb-3">
          <label className={labelClass}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={selectClass}
          >
            {VOUCHER_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errs?.currency ? <FieldError>{errs.currency}</FieldError> : null}
        </div>
        <SalaryStructureEditor
          name="salaryStructure"
          defaultValue={defaults.salaryStructure}
          currency={currency}
        />
        {errs?.salaryStructure ? (
          <FieldError>{errs.salaryStructure}</FieldError>
        ) : null}
      </Section>

      <Section
        icon={IdCard}
        title="Notes"
        subtitle="Internal context that travels with this employee"
        accent="from-amber-500 to-orange-600"
      >
        <textarea
          name="notes"
          defaultValue={defaults.notes}
          rows={4}
          maxLength={4000}
          placeholder="Bank details, reporting manager, contract terms, etc."
          className={cn(
            "w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
          )}
        />
      </Section>

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_18px_38px_-18px_rgba(24,24,27,0.22)] dark:border-zinc-800 dark:bg-zinc-900">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          <UserCog className="h-3.5 w-3.5" />
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create employee"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  accent,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br text-white shadow-sm",
            accent,
          )}
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
          />
          <Icon className="relative h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
