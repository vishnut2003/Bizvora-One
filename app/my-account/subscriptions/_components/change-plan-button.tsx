"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, Check } from "lucide-react";
import Popup from "@/components/popup";
import { buttonClasses } from "@/components/button";
import { cn } from "@/lib/cn";
import {
  BILLING_PERIOD_LABEL,
  formatPaise,
  type BillingPeriod,
} from "@/lib/billing";
import { changePlan } from "../../actions";

export type AvailablePlan = {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  period: BillingPeriod;
  featured: boolean;
  badge: string;
};

type ChangePlanButtonProps = {
  workspaceId: string;
  workspaceName: string;
  currentPlanId: string;
  availablePlans: AvailablePlan[];
};

export default function ChangePlanButton({
  workspaceId,
  workspaceName,
  currentPlanId,
  availablePlans,
}: ChangePlanButtonProps) {
  const others = availablePlans.filter((p) => p.id !== currentPlanId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    others[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (others.length === 0) return null;

  const handleConfirm = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await changePlan(workspaceId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 hover:underline dark:text-zinc-300"
      >
        <ArrowRightLeft className="h-3 w-3" />
        Switch plan
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        title={`Switch plan for ${workspaceName}`}
        description="The change takes effect at the end of your current billing cycle. No proration."
      >
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            {others.map((plan) => {
              const isSelected = selected === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelected(plan.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 dark:border-primary"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold">{plan.name}</p>
                      {plan.badge ? (
                        <span className="rounded-full bg-linear-to-r from-primary to-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-zinc-600 dark:text-zinc-400">
                      {formatPaise(plan.amount, plan.currency)} / user /{" "}
                      {BILLING_PERIOD_LABEL[plan.period]}
                    </p>
                    {plan.description ? (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {plan.description}
                      </p>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending || !selected}
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              {pending ? "Switching…" : "Confirm switch"}
            </button>
          </div>
        </div>
      </Popup>
    </>
  );
}
