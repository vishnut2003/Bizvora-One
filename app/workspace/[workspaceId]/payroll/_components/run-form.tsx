"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckSquare, Square, Wallet } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/voucher";
import { PERIOD_MONTHS } from "@/lib/payroll";
import { createRun, type CreateRunState } from "../actions";

export type RunCandidate = {
  id: string;
  name: string;
  empId: string;
  designation: string;
  currency: string;
  net: number;
};

type Props = {
  workspaceId: string;
  candidates: RunCandidate[];
  defaultMonth: number;
  defaultYear: number;
  defaultCurrency: string;
};

const INITIAL_STATE: CreateRunState = {};
const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";
const selectClass =
  "mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

export default function RunForm({
  workspaceId,
  candidates,
  defaultMonth,
  defaultYear,
  defaultCurrency,
}: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.filter((c) => c.currency === defaultCurrency).map((c) => c.id)),
  );

  const [state, formAction, pending] = useActionState(
    (prev: CreateRunState, formData: FormData) =>
      createRun(workspaceId, prev, formData),
    INITIAL_STATE,
  );

  const eligible = useMemo(
    () => candidates.filter((c) => c.currency === currency),
    [candidates, currency],
  );

  const selectedEligible = useMemo(
    () => eligible.filter((c) => selected.has(c.id)),
    [eligible, selected],
  );

  const totalNet = useMemo(
    () => selectedEligible.reduce((s, c) => s + c.net, 0),
    [selectedEligible],
  );

  const allSelected =
    eligible.length > 0 && eligible.every((c) => selected.has(c.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      if (eligible.every((c) => prev.has(c.id))) {
        const next = new Set(prev);
        eligible.forEach((c) => next.delete(c.id));
        return next;
      }
      const next = new Set(prev);
      eligible.forEach((c) => next.add(c.id));
      return next;
    });

  const currencies = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.currency))).sort(),
    [candidates],
  );

  const selectedIdsJson = JSON.stringify(
    selectedEligible.map((c) => c.id),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="periodMonth" value={month} readOnly />
      <input type="hidden" name="periodYear" value={year} readOnly />
      <input type="hidden" name="currency" value={currency} readOnly />
      <input type="hidden" name="employeeIds" value={selectedIdsJson} readOnly />

      <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-sm">
            <CalendarClock className="h-3.5 w-3.5" />
          </span>
          <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
            Period
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={selectClass}
            >
              {PERIOD_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className={labelClass}>
              Year
            </label>
            <Input
              id="year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || defaultYear)}
              className="mt-2"
            />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={selectClass}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        {state.errors?.period ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">
            {state.errors.period}
          </p>
        ) : null}
        {state.errors?.currency ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">
            {state.errors.currency}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
            Employees{" "}
            <span className="text-[12px] font-normal text-zinc-500 dark:text-zinc-400">
              ({currency})
            </span>
          </p>
          {eligible.length > 0 ? (
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
            >
              {allSelected ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {allSelected ? "Clear all" : "Select all"}
            </button>
          ) : null}
        </div>

        {eligible.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
            No active employees use {currency}. Add employees or switch currency.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {eligible.map((c) => {
              const checked = selected.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      checked
                        ? "bg-primary/[0.04] dark:bg-primary/10"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                    )}
                  >
                    {checked ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                        {c.name}{" "}
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                          {c.empId}
                        </span>
                      </span>
                      {c.designation ? (
                        <span className="block truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                          {c.designation}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(c.net, c.currency)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {state.errors?.employees ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">
            {state.errors.employees}
          </p>
        ) : null}
        <div className="flex items-center justify-between rounded-lg bg-zinc-100/70 px-3 py-2 text-[12.5px] dark:bg-zinc-800/40">
          <span className="text-zinc-500 dark:text-zinc-400">
            {selectedEligible.length} selected
          </span>
          <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            Net {formatCurrency(totalNet, currency)}
          </span>
        </div>
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
          disabled={pending || selectedEligible.length === 0}
          aria-busy={pending}
        >
          <Wallet className="h-3.5 w-3.5" />
          {pending ? "Generating…" : "Generate payslips"}
        </Button>
      </div>
    </form>
  );
}
