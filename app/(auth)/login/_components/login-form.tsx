"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Button from "@/components/button";
import Field from "@/components/field";
import GoogleIcon from "@/components/google-icon";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "../actions";

function mapAuthError(error: string | null): string | null {
  if (!error) return null;
  switch (error) {
    case "OAuthAccountNotLinked":
      return "An account with this email already exists. Sign in with the original provider.";
    case "AccessDenied":
      return "Access denied. Try again or contact support.";
    case "OAuthCallback":
    case "OAuthSignin":
    case "Callback":
      return "Google sign-in failed. Please try again.";
    case "CredentialsSignin":
      return "Invalid email or password.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/workspace";
  const urlError = mapAuthError(searchParams.get("error"));

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  const displayError = state?.formError ?? urlError;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-8 h-10 w-full px-3"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="uppercase tracking-wider">or sign in with email</span>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Field
          id="email"
          label="Work email"
          type="email"
          placeholder="jane@acme.co"
          autoComplete="email"
          required
          error={state?.errors?.email}
        />
        <div>
          <Field
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            error={state?.errors?.password}
          />
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <input
                name="remember"
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {displayError ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {displayError}
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
          {pending ? "Signing in…" : "Sign in"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>

        <p className="pt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-500">
          Protected by industry-standard encryption. Your data stays yours.
        </p>
      </form>
    </>
  );
}
