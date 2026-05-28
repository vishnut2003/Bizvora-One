"use client";

import { useActionState, useEffect } from "react";
import { Lock } from "lucide-react";
import Field from "@/components/field";
import Popup from "@/components/popup";
import { buttonClasses } from "@/components/button";
import { updatePlanMetadata, type UpdatePlanState } from "../actions";
import type { PlanRow } from "./plan-list";

type EditPlanFormProps = {
  plan: PlanRow;
  onClose: () => void;
};

export default function EditPlanForm({ plan, onClose }: EditPlanFormProps) {
  const [state, formAction, pending] = useActionState<
    UpdatePlanState,
    FormData
  >(updatePlanMetadata, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state?.ok, onClose]);

  return (
    <Popup
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Edit ${plan.name}`}
      description="Only metadata can be edited. Pricing is immutable in Razorpay."
    >
      <form action={formAction} className="space-y-4 px-6 pb-6">
        <input type="hidden" name="planId" value={plan.id} />

        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-800/40">
          <p className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
            <Lock className="h-3 w-3" />
            Locked (Razorpay constraint)
          </p>
          <p className="mt-1 text-zinc-500">
            Price <strong>{plan.formattedAmount}</strong> /{" "}
            {plan.interval > 1 ? `${plan.interval} ` : ""}
            {plan.periodLabel} · Plan ID{" "}
            <span className="font-mono">{plan.razorpayPlanId}</span>
          </p>
          <p className="mt-1.5 text-zinc-500">
            To change price or period, archive this plan and create a new one.
          </p>
        </div>

        <Field
          id="name"
          label="Display name"
          defaultValue={plan.name}
          required
          error={state?.errors?.name}
        />
        <Field
          id="description"
          label="Description"
          defaultValue={plan.description}
        />
        <Field
          id="badge"
          label="Badge"
          defaultValue={plan.badge}
          hint='e.g. "Save 33%" — max 24 chars'
          error={state?.errors?.badge}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="sortOrder"
            label="Sort order"
            type="number"
            defaultValue={String(plan.sortOrder)}
            error={state?.errors?.sortOrder}
          />
          <div className="flex flex-col justify-end gap-2 pb-2">
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={plan.featured}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="visible"
                defaultChecked={plan.visible}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
              />
              Visible on pricing page
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
            onClick={onClose}
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
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Popup>
  );
}
