"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Button from "@/components/button";
import Field from "@/components/field";
import { ArrowRight } from "lucide-react";
import { signup, type SignupState } from "../actions";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signup,
    undefined,
  );

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-8 h-10 w-full px-3"
        onClick={() => signIn("google", { callbackUrl: "/workspace" })}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="uppercase tracking-wider">or with email</span>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <Field
          id="name"
          label="Full name"
          placeholder="Jane Doe"
          autoComplete="name"
          required
          error={state?.errors?.name}
        />
        <Field
          id="email"
          label="Work email"
          type="email"
          placeholder="jane@acme.co"
          autoComplete="email"
          required
          error={state?.errors?.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          hint="Use 8+ characters with a mix of letters and numbers."
          required
          error={state?.errors?.password}
        />

        <div>
          <label className="flex items-start gap-2.5 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              name="terms"
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {state?.errors?.terms ? (
            <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
              {state.errors.terms}
            </p>
          ) : null}
        </div>

        {state?.formError ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {state.formError}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="mt-2 w-full"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Creating account…" : "Continue"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>

        <p className="pt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-500">
          Protected by industry-standard encryption. Your data stays yours.
        </p>
      </form>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.95l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
