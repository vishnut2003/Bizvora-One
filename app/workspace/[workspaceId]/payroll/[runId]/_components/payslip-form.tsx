"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import Button from "@/components/button";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/voucher";
import type { SalaryLine, SalaryStructure } from "@/lib/payroll";
import { updatePayslipAdjustments, type PayslipFormState } from "../../actions";
import SalaryStructureEditor from "../../../employees/_components/salary-structure-editor";

type Props = {
  workspaceId: string;
  runId: string;
  payslipId: string;
  employeeName: string;
  currency: string;
  baseEarnings: SalaryLine[];
  baseDeductions: SalaryLine[];
  adjustments: SalaryStructure;
  notes: string;
};

const INITIAL_STATE: PayslipFormState = {};

export default function PayslipForm({
  workspaceId,
  runId,
  payslipId,
  employeeName,
  currency,
  baseEarnings,
  baseDeductions,
  adjustments,
  notes,
}: Props) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    (prev: PayslipFormState, formData: FormData) =>
      updatePayslipAdjustments(workspaceId, runId, payslipId, prev, formData),
    INITIAL_STATE,
  );

  const baseGross = baseEarnings.reduce((s, l) => s + l.amount, 0);
  const baseDed = baseDeductions.reduce((s, l) => s + l.amount, 0);

  return (
    <form action={formAction} className="space-y-5">
      <section className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
          Base salary (snapshot)
        </p>
        <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
          Taken from {employeeName}&apos;s salary structure when the run was
          generated. Read-only — edit the employee to change future runs.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyLines title="Earnings" lines={baseEarnings} currency={currency} total={baseGross} />
          <ReadOnlyLines title="Deductions" lines={baseDeductions} currency={currency} total={baseDed} />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
              Adjustments
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              One-off earnings (e.g. bonus) or deductions (e.g. loss of pay) for
              this payslip only. The totals below combine base + adjustments.
            </p>
          </div>
        </div>
        <SalaryStructureEditor
          name="adjustments"
          defaultValue={adjustments}
          currency={currency}
          earningsLabel="Extra earnings"
          deductionsLabel="Extra deductions"
        />
      </section>

      <section className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <label
          htmlFor="notes"
          className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={notes}
          rows={3}
          maxLength={2000}
          placeholder="Optional note shown on this payslip."
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </section>

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
          {pending ? "Saving…" : "Save payslip"}
        </Button>
      </div>
    </form>
  );
}

function ReadOnlyLines({
  title,
  lines,
  currency,
  total,
}: {
  title: string;
  lines: SalaryLine[];
  currency: string;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <p className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">
          {title}
        </p>
        <span className="text-[12px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatCurrency(total, currency)}
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="px-3 py-2 text-[12px] text-zinc-400 dark:text-zinc-500">
          None.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {lines.map((l, i) => (
            <li
              key={`${l.label}-${i}`}
              className={cn(
                "flex items-center justify-between px-3 py-1.5 text-[12.5px]",
              )}
            >
              <span className="truncate text-zinc-600 dark:text-zinc-300">
                {l.label}
              </span>
              <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(l.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
