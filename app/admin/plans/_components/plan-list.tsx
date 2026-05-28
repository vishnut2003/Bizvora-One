"use client";

import { useState } from "react";
import {
  CreditCard,
  Eye,
  EyeOff,
  Pencil,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { BillingPeriod } from "@/lib/billing";
import EditPlanForm from "./edit-plan-form";
import ArchivePlanButton from "./archive-plan-button";

export type PlanRow = {
  id: string;
  razorpayPlanId: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  period: BillingPeriod;
  interval: number;
  badge: string;
  featured: boolean;
  visible: boolean;
  archived: boolean;
  sortOrder: number;
  subscriberCount: number;
  formattedAmount: string;
  periodLabel: string;
};

export default function PlanList({ plans }: { plans: PlanRow[] }) {
  const [editing, setEditing] = useState<PlanRow | null>(null);

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <CreditCard className="mx-auto h-8 w-8 text-zinc-400" />
        <p className="mt-3 text-[14px] font-medium text-zinc-700 dark:text-zinc-200">
          No plans yet.
        </p>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          Run the seed script or click &ldquo;New plan&rdquo; to add one.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex flex-wrap items-center gap-3.5 px-4 py-3.5 sm:px-5",
                p.archived && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg text-white shadow-sm",
                  p.featured
                    ? "bg-gradient-to-br from-primary to-secondary"
                    : "bg-gradient-to-br from-zinc-500 to-zinc-700",
                )}
              >
                <CreditCard className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {p.name}
                  </p>
                  {p.badge ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                      <Sparkles className="h-2.5 w-2.5" />
                      {p.badge}
                    </span>
                  ) : null}
                  {p.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      <Star className="h-2.5 w-2.5" />
                      Featured
                    </span>
                  ) : null}
                  {p.archived ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      Archived
                    </span>
                  ) : !p.visible ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <EyeOff className="h-2.5 w-2.5" />
                      Hidden
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Eye className="h-2.5 w-2.5" />
                      Visible
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                  {p.formattedAmount}
                  <span className="mx-1 text-zinc-300">/</span>
                  user
                  <span className="mx-1 text-zinc-300">/</span>
                  {p.interval > 1 ? `${p.interval} ${p.periodLabel}s` : p.periodLabel}
                  <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">
                    ·
                  </span>
                  <span className="font-mono text-[10px]">
                    {p.razorpayPlanId}
                  </span>
                </p>
              </div>

              <div className="hidden text-right text-[12px] text-zinc-500 sm:block dark:text-zinc-400">
                <p className="tabular-nums">
                  {p.subscriberCount}{" "}
                  {p.subscriberCount === 1 ? "subscriber" : "subscribers"}
                </p>
                <p className="mt-0.5 tabular-nums">Sort {p.sortOrder}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <ArchivePlanButton
                  planId={p.id}
                  planName={p.name}
                  archived={p.archived}
                  subscriberCount={p.subscriberCount}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        <EditPlanForm
          plan={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

