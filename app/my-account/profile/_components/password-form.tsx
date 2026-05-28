"use client";

import { useActionState, useEffect, useRef } from "react";
import Field from "@/components/field";
import { buttonClasses } from "@/components/button";
import { updatePassword, type UpdatePasswordState } from "../../actions";

type PasswordFormProps = {
  hasCredentials: boolean;
};

export default function PasswordForm({ hasCredentials }: PasswordFormProps) {
  const [state, formAction, pending] = useActionState<
    UpdatePasswordState,
    FormData
  >(updatePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields on success so the form is ready for a re-entry.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state?.ok]);

  return (
    <form action={formAction} ref={formRef} className="space-y-3 px-5 py-4">
      {hasCredentials ? (
        <Field
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          error={state?.errors?.currentPassword}
        />
      ) : (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
          Set a password so you can sign in with email + password (in addition
          to Google).
        </p>
      )}
      <Field
        id="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        required
        error={state?.errors?.newPassword}
      />
      <Field
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        error={state?.errors?.confirmPassword}
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
          Password updated.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ variant: "primary", size: "sm" })}
        >
          {pending
            ? "Saving…"
            : hasCredentials
              ? "Change password"
              : "Set password"}
        </button>
      </div>
    </form>
  );
}
