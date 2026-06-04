"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@/lib/voucher";
import {
  computeTotals,
  roundCurrency,
  type SalaryLine,
  type SalaryStructure,
} from "@/lib/payroll";
import { cn } from "@/lib/cn";

type Props = {
  // Name of the hidden input the serialized JSON is written to.
  name: string;
  defaultValue: SalaryStructure;
  currency: string;
  earningsLabel?: string;
  deductionsLabel?: string;
  // When this editor edits *adjustments* on top of a base salary (payslip
  // form), pass the base totals so the summary and over-deducted warning
  // reflect base + adjustments rather than the adjustments alone.
  baseGross?: number;
  baseDeductions?: number;
};

type Row = SalaryLine & { key: string };

let keySeq = 0;
function newKey(): string {
  keySeq += 1;
  return `row-${keySeq}`;
}

function toRows(lines: SalaryLine[]): Row[] {
  return lines.map((l) => ({ ...l, key: newKey() }));
}

export default function SalaryStructureEditor({
  name,
  defaultValue,
  currency,
  earningsLabel = "Earnings",
  deductionsLabel = "Deductions",
  baseGross = 0,
  baseDeductions = 0,
}: Props) {
  const [earnings, setEarnings] = useState<Row[]>(() =>
    toRows(defaultValue.earnings),
  );
  const [deductions, setDeductions] = useState<Row[]>(() =>
    toRows(defaultValue.deductions),
  );

  // Totals of the lines in *this* editor (the adjustments, in the payslip case).
  const lineTotals = useMemo(
    () =>
      computeTotals(
        earnings.map((r) => ({ label: r.label, amount: r.amount })),
        deductions.map((r) => ({ label: r.label, amount: r.amount })),
      ),
    [earnings, deductions],
  );

  // Combined with any base passed in (base is 0 for the plain employee editor),
  // so the summary and warning reflect the full payslip, not just adjustments.
  const totals = useMemo(() => {
    const gross = roundCurrency(baseGross + lineTotals.gross);
    const totalDeductions = roundCurrency(
      baseDeductions + lineTotals.totalDeductions,
    );
    return {
      gross,
      totalDeductions,
      net: roundCurrency(Math.max(0, gross - totalDeductions)),
    };
  }, [baseGross, baseDeductions, lineTotals]);

  const serialized = useMemo(
    () =>
      JSON.stringify({
        earnings: earnings.map((r) => ({ label: r.label, amount: r.amount })),
        deductions: deductions.map((r) => ({
          label: r.label,
          amount: r.amount,
        })),
      }),
    [earnings, deductions],
  );

  const overDeducted = totals.totalDeductions > totals.gross;

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serialized} readOnly />

      <LineTable
        title={earningsLabel}
        rows={earnings}
        onChange={setEarnings}
        currency={currency}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <LineTable
        title={deductionsLabel}
        rows={deductions}
        onChange={setDeductions}
        currency={currency}
        accent="text-rose-600 dark:text-rose-400"
      />

      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Gross
            </dt>
            <dd className="mt-1 text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(totals.gross, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Deductions
            </dt>
            <dd className="mt-1 text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(totals.totalDeductions, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Net
            </dt>
            <dd className="mt-1 text-[15px] font-semibold tabular-nums text-primary">
              {formatCurrency(totals.net, currency)}
            </dd>
          </div>
        </dl>
        {overDeducted ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <TriangleAlert className="h-3.5 w-3.5" />
            Deductions exceed gross — net is floored at zero.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LineTable({
  title,
  rows,
  onChange,
  currency,
  accent,
}: {
  title: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  currency: string;
  accent: string;
}) {
  const update = (key: string, patch: Partial<SalaryLine>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => onChange(rows.filter((r) => r.key !== key));
  const add = () => onChange([...rows, { key: newKey(), label: "", amount: 0 }]);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <p className={cn("text-[12px] font-semibold", accent)}>{title}</p>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {currency}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 px-3 py-2">
              <input
                type="text"
                value={r.label}
                maxLength={80}
                onChange={(e) => update(r.key, { label: e.target.value })}
                placeholder="e.g. Basic, HRA, PF…"
                className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(r.amount) && r.amount !== 0 ? r.amount : ""}
                onChange={(e) =>
                  update(r.key, { amount: Number(e.target.value) || 0 })
                }
                placeholder="0.00"
                className="h-9 w-32 rounded-md border border-zinc-200 bg-white px-2.5 text-right text-sm tabular-nums text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => remove(r.key)}
                aria-label="Remove line"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Add line
        </button>
      </div>
    </div>
  );
}
