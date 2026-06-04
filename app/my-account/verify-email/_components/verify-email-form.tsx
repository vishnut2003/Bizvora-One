"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import Button from "@/components/button";
import Field from "@/components/field";
import {
  requestEmailVerification,
  verifyEmail,
  type RequestVerificationState,
  type VerifyEmailState,
} from "../actions";

type Step = "request" | "code";

function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </p>
  );
}

export default function VerifyEmailForm({ email }: { email: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");

  const [reqState, reqAction, reqPending] = useActionState<
    RequestVerificationState,
    FormData
  >(async () => {
    const res = await requestEmailVerification();
    if (res?.alreadyVerified) {
      router.replace("/workspace");
      return res;
    }
    if (res?.ok) setStep("code");
    return res;
  }, undefined);

  const [verifyState, verifyAction, verifyPending] = useActionState<
    VerifyEmailState,
    FormData
  >(async (prev, formData) => {
    const res = await verifyEmail(prev, formData);
    if (res?.ok) router.replace("/workspace");
    return res;
  }, undefined);

  return (
    <div className="mt-2">
      {step === "request" ? (
        <form action={reqAction} className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              We&apos;ll email a 6-digit verification code to{" "}
              <strong>{email ?? "your address"}</strong>.
            </span>
          </div>

          <ErrorAlert message={reqState?.formError} />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={reqPending}
            aria-busy={reqPending}
          >
            {reqPending ? "Sending code…" : "Send verification code"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              We sent a 6-digit code to <strong>{email ?? "your address"}</strong>.
              Enter it below to verify your email.
            </span>
          </div>

          <Field
            id="code"
            label="Verification code"
            type="text"
            placeholder="123456"
            autoComplete="one-time-code"
            required
            error={verifyState?.errors?.code}
          />

          <ErrorAlert message={verifyState?.formError} />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={verifyPending}
            aria-busy={verifyPending}
          >
            {verifyPending ? "Verifying…" : "Verify email"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>

          <div className="text-center text-[12px]">
            <button
              type="button"
              onClick={() => reqAction(new FormData())}
              disabled={reqPending}
              className="font-medium text-zinc-900 underline-offset-2 hover:underline disabled:opacity-60 dark:text-zinc-100"
            >
              {reqPending ? "Resending…" : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
