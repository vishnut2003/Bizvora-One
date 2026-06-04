import type { UserRole } from "@/lib/user";

// Shared types, math, and visual maps for the Payroll module (Employees,
// Payroll Runs, Payslips). Kept Mongoose-free so client components (forms,
// the salary-structure editor, the PDF document) can import from here without
// pulling the database layer into the browser bundle. Run number generation
// is period-derived (PR-YYYY-MM) and lives here since a run is uniquely the
// workspace's payroll for one calendar month.

// ── Status sets ────────────────────────────────────────────────────────────

export const EMPLOYEE_STATUSES = [
  "active",
  "on_leave",
  "terminated",
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const PAYROLL_RUN_STATUSES = [
  "draft",
  "approved",
  "paid",
  "cancelled",
] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

// Payslip status mostly tracks its run (draft → finalized on approve → paid on
// mark-paid), but "excluded" lets a payslip sit in a draft run without being
// counted in totals or carried into approval.
export const PAYSLIP_STATUSES = [
  "draft",
  "finalized",
  "paid",
  "excluded",
] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "intern",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

// ── Labels ───────────────────────────────────────────────────────────────

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  terminated: "Terminated",
};

export const PAYROLL_RUN_STATUS_LABEL: Record<PayrollRunStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const PAYSLIP_STATUS_LABEL: Record<PayslipStatus, string> = {
  draft: "Draft",
  finalized: "Finalized",
  paid: "Paid",
  excluded: "Excluded",
};

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

// ── Badge classes (mirror lib/voucher.ts BADGE_* style) ──────────────────────

const BADGE_DRAFT =
  "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25";
const BADGE_BLUE =
  "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25";
const BADGE_AMBER =
  "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25";
const BADGE_GREEN =
  "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25";
const BADGE_ROSE =
  "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25";
const BADGE_VIOLET =
  "bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25";

export const EMPLOYEE_STATUS_BADGE_CLASS: Record<EmployeeStatus, string> = {
  active: BADGE_GREEN,
  on_leave: BADGE_AMBER,
  terminated: BADGE_ROSE,
};

export const PAYROLL_RUN_STATUS_BADGE_CLASS: Record<PayrollRunStatus, string> = {
  draft: BADGE_DRAFT,
  approved: BADGE_BLUE,
  paid: BADGE_GREEN,
  cancelled: BADGE_ROSE,
};

export const PAYSLIP_STATUS_BADGE_CLASS: Record<PayslipStatus, string> = {
  draft: BADGE_DRAFT,
  finalized: BADGE_BLUE,
  paid: BADGE_GREEN,
  excluded: BADGE_VIOLET,
};

// ── Role gates (mirror EMPLOYEE_MANAGER_ROLES in lib/user.ts) ─────────────────

export const PAYROLL_MANAGER_ROLES: UserRole[] = ["owner", "admin", "hr"];

export function canManagePayroll(role: UserRole): boolean {
  return PAYROLL_MANAGER_ROLES.includes(role);
}

// Same set as manage for v1, kept separate so view/manage can diverge later.
export function canViewPayroll(role: UserRole): boolean {
  return PAYROLL_MANAGER_ROLES.includes(role);
}

// ── Salary structure types + math ────────────────────────────────────────────

export type SalaryLine = { label: string; amount: number };
export type SalaryStructure = {
  earnings: SalaryLine[];
  deductions: SalaryLine[];
};
export type PayrollTotals = {
  gross: number;
  totalDeductions: number;
  net: number;
};

export const EMPTY_SALARY_STRUCTURE: SalaryStructure = {
  earnings: [],
  deductions: [],
};

export function roundCurrency(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function sumLines(lines: SalaryLine[]): number {
  return roundCurrency(
    lines.reduce(
      (sum, l) =>
        sum + (Number.isFinite(l.amount) && l.amount > 0 ? l.amount : 0),
      0,
    ),
  );
}

// Net is floored at 0 (mirrors the Math.max(0, ...) in voucher computeTotals).
// The UI surfaces a non-blocking warning when deductions exceed gross.
export function computeTotals(
  earnings: SalaryLine[],
  deductions: SalaryLine[],
): PayrollTotals {
  const gross = sumLines(earnings);
  const totalDeductions = sumLines(deductions);
  const net = roundCurrency(Math.max(0, gross - totalDeductions));
  return { gross, totalDeductions, net };
}

// ── Attendance / Loss-of-Pay ─────────────────────────────────────────────────

// Gross-based per-day LOP: perDay = gross / workingDays, LOP = perDay × lopDays.
// Returns 0 when there's nothing to deduct (no pay, no working-day base, or no
// LOP days). lopDays is clamped to [0, workingDays] so a payslip can never be
// docked more than the full period.
export function computeLopAmount(
  gross: number,
  workingDays: number,
  lopDays: number,
): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  if (!Number.isFinite(workingDays) || workingDays <= 0) return 0;
  const days = Math.min(Math.max(Number.isFinite(lopDays) ? lopDays : 0, 0), workingDays);
  if (days <= 0) return 0;
  return roundCurrency((gross / workingDays) * days);
}

// Label for the auto-seeded LOP deduction line, e.g. "Loss of Pay (3 days)".
export function lopLineLabel(lopDays: number): string {
  const n = Math.max(0, Math.round(lopDays));
  return `Loss of Pay (${n} ${n === 1 ? "day" : "days"})`;
}

// Calendar days in a month (1-indexed month). Used as the run-form default for
// the working-day base. Day 0 of the next month is the last day of this one.
export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

const MAX_LABEL = 80;

// Fault-tolerant parse of a salary structure posted as JSON from the form.
// Mirrors parseVoucherItems in lib/voucher.ts. Drops rows with no label and a
// zero amount; coerces amounts to finite >= 0. Returns null only on malformed
// JSON or a non-object shape.
export function parseSalaryStructure(raw: string): SalaryStructure | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    const earnings = parseLines(obj.earnings);
    const deductions = parseLines(obj.deductions);
    return { earnings, deductions };
  } catch {
    return null;
  }
}

function parseLines(value: unknown): SalaryLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const r = row as Record<string, unknown>;
      const label = String(r.label ?? "")
        .trim()
        .slice(0, MAX_LABEL);
      const amountRaw = Number(r.amount ?? 0);
      const amount =
        Number.isFinite(amountRaw) && amountRaw > 0 ? roundCurrency(amountRaw) : 0;
      return { label, amount };
    })
    .filter((l) => l.label.length > 0 || l.amount > 0);
}

// ── Period helpers ───────────────────────────────────────────────────────────

export const PERIOD_MONTHS: { value: number; label: string }[] = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function formatPeriod(month: number, year: number): string {
  const m = PERIOD_MONTHS.find((p) => p.value === month);
  return `${m?.label ?? "—"} ${year}`;
}

// Period-derived run number, e.g. PR-2026-06.
export function formatRunNumber(year: number, month: number): string {
  return `PR-${year}-${String(month).padStart(2, "0")}`;
}
