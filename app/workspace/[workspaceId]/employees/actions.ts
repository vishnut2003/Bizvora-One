"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Employee from "@/models/employee";
import Payslip from "@/models/payslip";
import { getActorRole } from "@/lib/workspace-access";
import { canManageEmployees } from "@/lib/user";
import { VOUCHER_CURRENCIES, parseDate } from "@/lib/voucher";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  parseSalaryStructure,
  sumLines,
  type EmployeeStatus,
  type EmploymentType,
  type SalaryStructure,
} from "@/lib/payroll";

export type EmployeeActionState = {
  ok?: true;
  formError?: string;
  errors?: Partial<
    Record<
      "empId" | "name" | "email" | "phone" | "status" | "currency" | "salaryStructure",
      string
    >
  >;
};

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

async function loadContext(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      error: "Your session expired. Please sign in again.",
    };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false as const, error: "Invalid workspace." };
  }
  await connectDB();
  const workspaceDoc = await Workspace.findById(workspaceId);
  if (!workspaceDoc) {
    return { ok: false as const, error: "Workspace not found." };
  }
  const role = getActorRole(workspaceDoc, session.user.id);
  if (!canManageEmployees(role)) {
    return {
      ok: false as const,
      error: "You don't have permission to manage employees.",
    };
  }
  return { ok: true as const, session: session as AuthedSession, role };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmployeeStatus(v: string): v is EmployeeStatus {
  return (EMPLOYEE_STATUSES as readonly string[]).includes(v);
}

function isEmploymentType(v: string): v is EmploymentType {
  return (EMPLOYMENT_TYPES as readonly string[]).includes(v);
}

function isCurrency(v: string): boolean {
  return (VOUCHER_CURRENCIES as readonly string[]).includes(v);
}

type ParsedEmployee = {
  empId: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: EmploymentType;
  dateOfJoining: Date | null;
  status: EmployeeStatus;
  currency: string;
  linkedUser: string | null;
  salaryStructure: SalaryStructure;
  notes: string;
};

function parseForm(
  formData: FormData,
):
  | { ok: true; data: ParsedEmployee }
  | { ok: false; errors: NonNullable<EmployeeActionState["errors"]> } {
  const errors: NonNullable<EmployeeActionState["errors"]> = {};

  const empId = ((formData.get("empId") as string | null) ?? "")
    .trim()
    .toUpperCase();
  if (!empId) errors.empId = "Employee ID is required.";
  else if (empId.length > 32) errors.empId = "Employee ID is too long (max 32).";

  const name = ((formData.get("name") as string | null) ?? "").trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length > 160) errors.name = "Name is too long (max 160).";

  const email = ((formData.get("email") as string | null) ?? "")
    .trim()
    .toLowerCase();
  if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email.";

  const phone = ((formData.get("phone") as string | null) ?? "").trim();
  if (phone.length > 40) errors.phone = "Phone is too long.";

  const statusRaw = ((formData.get("status") as string | null) ?? "active").trim();
  if (!isEmployeeStatus(statusRaw)) errors.status = "Pick a status.";

  const currency = ((formData.get("currency") as string | null) ?? "INR").trim();
  if (!isCurrency(currency)) errors.currency = "Pick a valid currency.";

  const employmentTypeRaw = (
    (formData.get("employmentType") as string | null) ?? "full_time"
  ).trim();
  const employmentType = isEmploymentType(employmentTypeRaw)
    ? employmentTypeRaw
    : "full_time";

  const structure = parseSalaryStructure(
    (formData.get("salaryStructure") as string | null) ?? "",
  );
  if (!structure) errors.salaryStructure = "Salary structure is invalid.";

  const linkedUserRaw = ((formData.get("linkedUser") as string | null) ?? "").trim();
  const linkedUser =
    linkedUserRaw && mongoose.Types.ObjectId.isValid(linkedUserRaw)
      ? linkedUserRaw
      : null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      empId,
      name,
      email,
      phone,
      designation: ((formData.get("designation") as string | null) ?? "").trim(),
      department: ((formData.get("department") as string | null) ?? "").trim(),
      employmentType,
      dateOfJoining: parseDate(formData.get("dateOfJoining") as string | null),
      status: statusRaw as EmployeeStatus,
      currency,
      linkedUser,
      salaryStructure: structure as SalaryStructure,
      notes: ((formData.get("notes") as string | null) ?? "").trim().slice(0, 4000),
    },
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export async function createEmployee(
  workspaceId: string,
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };

  const parsed = parseForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  // Friendly pre-checks before relying on the unique indexes.
  const dupId = await Employee.findOne({ workspace: workspaceId, empId: d.empId })
    .select("_id")
    .lean();
  if (dupId) {
    return { errors: { empId: "An employee with this ID already exists." } };
  }
  if (d.linkedUser) {
    const dupLink = await Employee.findOne({
      workspace: workspaceId,
      linkedUser: d.linkedUser,
    })
      .select("_id")
      .lean();
    if (dupLink) {
      return { formError: "That user is already linked to another employee." };
    }
  }

  try {
    await Employee.create({
      workspace: workspaceId,
      empId: d.empId,
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      designation: d.designation,
      department: d.department,
      employmentType: d.employmentType,
      dateOfJoining: d.dateOfJoining,
      status: d.status,
      linkedUser: d.linkedUser,
      salaryStructure: d.salaryStructure,
      currency: d.currency,
      monthlyCtc: sumLines(d.salaryStructure.earnings),
      notes: d.notes,
      createdBy: ctx.session.user.id,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        formError:
          "An employee with this ID or linked user already exists in this workspace.",
      };
    }
    console.error("[createEmployee] failed", err);
    return { formError: "Couldn't create the employee. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/employees`);
  redirect(`/workspace/${workspaceId}/employees`);
}

export async function updateEmployee(
  workspaceId: string,
  employeeId: string,
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { formError: ctx.error };
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { formError: "Invalid employee id." };
  }

  const existing = await Employee.findOne({
    _id: employeeId,
    workspace: workspaceId,
  });
  if (!existing) return { formError: "Employee not found." };

  const parsed = parseForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;

  const dupId = await Employee.findOne({
    workspace: workspaceId,
    empId: d.empId,
    _id: { $ne: employeeId },
  })
    .select("_id")
    .lean();
  if (dupId) {
    return { errors: { empId: "An employee with this ID already exists." } };
  }
  if (d.linkedUser) {
    const dupLink = await Employee.findOne({
      workspace: workspaceId,
      linkedUser: d.linkedUser,
      _id: { $ne: employeeId },
    })
      .select("_id")
      .lean();
    if (dupLink) {
      return { formError: "That user is already linked to another employee." };
    }
  }

  existing.empId = d.empId;
  existing.name = d.name;
  existing.email = d.email || null;
  existing.phone = d.phone || null;
  existing.designation = d.designation;
  existing.department = d.department;
  existing.employmentType = d.employmentType;
  existing.dateOfJoining = d.dateOfJoining;
  existing.status = d.status;
  existing.linkedUser = d.linkedUser
    ? new mongoose.Types.ObjectId(d.linkedUser)
    : null;
  existing.salaryStructure = d.salaryStructure as typeof existing.salaryStructure;
  existing.currency = d.currency;
  existing.monthlyCtc = sumLines(d.salaryStructure.earnings);
  existing.notes = d.notes;

  // Note: editing the salary structure here never touches existing payslips —
  // those hold a snapshot taken at run-generation time.
  try {
    await existing.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        formError:
          "An employee with this ID or linked user already exists in this workspace.",
      };
    }
    console.error("[updateEmployee] failed", err);
    return { formError: "Couldn't save the employee. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/employees`);
  revalidatePath(`/workspace/${workspaceId}/employees/${employeeId}/edit`);
  redirect(`/workspace/${workspaceId}/employees`);
}

export async function deleteEmployee(
  workspaceId: string,
  employeeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadContext(workspaceId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { ok: false, error: "Invalid employee id." };
  }

  const payslipCount = await Payslip.countDocuments({
    workspace: workspaceId,
    employee: employeeId,
  });
  if (payslipCount > 0) {
    return {
      ok: false,
      error: `Can't remove this employee — they're on ${payslipCount} payslip${payslipCount === 1 ? "" : "s"}. Remove them from those payroll runs first.`,
    };
  }

  await Employee.deleteOne({ _id: employeeId, workspace: workspaceId });
  revalidatePath(`/workspace/${workspaceId}/employees`);
  return { ok: true };
}
