"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Field from "@/components/field";
import Popup from "@/components/popup";
import { buttonClasses } from "@/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLING_PERIODS, type BillingPeriod } from "@/lib/billing";
import { createPlan, type CreatePlanState } from "../actions";

export default function CreatePlanButton() {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [state, formAction, pending] = useActionState<
    CreatePlanState,
    FormData
  >(createPlan, undefined);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state?.ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: "primary", size: "sm" })}
      >
        <Plus className="h-3.5 w-3.5" />
        New plan
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        title="Create a plan"
        description="Provisions the plan in Razorpay and saves it locally."
      >
        <form action={formAction} className="space-y-4 px-6 pb-6">
          <Field
            id="name"
            label="Display name"
            placeholder="Annual / Monthly / Quarterly"
            required
            error={state?.errors?.name}
          />
          <Field
            id="description"
            label="Description (optional)"
            placeholder="Complete access to every feature."
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Field
                id="amountRupees"
                label="Amount (₹)"
                type="number"
                placeholder="300"
                required
                error={state?.errors?.amount}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Period
              </label>
              <div className="mt-1.5">
                <Select
                  value={period}
                  onValueChange={(v) => setPeriod(v as BillingPeriod)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === "monthly" ? "Monthly" : "Yearly"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="period" value={period} />
              </div>
              {state?.errors?.period ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {state.errors.period}
                </p>
              ) : null}
            </div>
            <div className="col-span-1">
              <Field
                id="interval"
                label="Every"
                type="number"
                defaultValue="1"
                hint="e.g. 1 = each period"
                error={state?.errors?.interval}
              />
            </div>
          </div>

          <Field
            id="badge"
            label="Badge (optional)"
            placeholder="Save 33%"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="sortOrder"
              label="Sort order"
              type="number"
              defaultValue="0"
            />
            <div className="flex flex-col justify-end gap-2 pb-2">
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="featured"
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
                />
                Featured (highlighted)
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
                />
                Visible on public pricing page
              </label>
            </div>
          </div>

          {state?.formError ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {state.formError}
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
              type="submit"
              disabled={pending}
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              {pending ? "Creating…" : "Create plan"}
            </button>
          </div>
        </form>
      </Popup>
    </>
  );
}
