"use client";

import { useActionState } from "react";
import Field from "@/components/field";
import { buttonClasses } from "@/components/button";
import {
  updateProfileName,
  type UpdateProfileNameState,
} from "../../actions";

export default function NameForm({ defaultValue }: { defaultValue: string }) {
  const [state, formAction, pending] = useActionState<
    UpdateProfileNameState,
    FormData
  >(updateProfileName, undefined);

  return (
    <form action={formAction} className="space-y-3 px-5 py-4">
      <Field
        id="name"
        label="Display name"
        defaultValue={defaultValue}
        required
        error={state?.errors?.name}
      />
      {state?.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
          Saved.
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ variant: "primary", size: "sm" })}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
