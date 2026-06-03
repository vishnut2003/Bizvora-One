"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Button, { buttonClasses } from "@/components/button";
import Field from "@/components/field";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import {
  requestOtp,
  verifyOtp,
  resetPassword,
  type RequestOtpState,
  type VerifyOtpState,
  type ResetPasswordState,
} from "../actions";

type Step = "email" | "otp" | "reset" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "otp", label: "Verify" },
  { key: "reset", label: "New password" },
];

function StepIndicator({ current }: { current: Step }) {
  // "done" counts as past the final step.
  const order: Step[] = ["email", "otp", "reset"];
  const currentIndex = current === "done" ? order.length : order.indexOf(current);

  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={[
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                done
                  ? "bg-primary text-white"
                  : active
                    ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
              ].join(" ")}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            {i < STEPS.length - 1 ? (
              <span
                className={[
                  "h-px flex-1",
                  done ? "bg-primary/40" : "bg-zinc-200 dark:bg-zinc-800",
                ].join(" ")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

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

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const [reqState, reqAction, reqPending] = useActionState<
    RequestOtpState,
    FormData
  >(async (prev, formData) => {
    const res = await requestOtp(prev, formData);
    if (res?.ok) {
      setEmail(String(formData.get("email") ?? "").trim().toLowerCase());
      setStep("otp");
    }
    return res;
  }, undefined);

  const [verifyState, verifyAction, verifyPending] = useActionState<
    VerifyOtpState,
    FormData
  >(async (prev, formData) => {
    const res = await verifyOtp(prev, formData);
    if (res?.ok && res.token) {
      setToken(res.token);
      setStep("reset");
    }
    return res;
  }, undefined);

  const [resetState, resetAction, resetPending] = useActionState<
    ResetPasswordState,
    FormData
  >(async (prev, formData) => {
    const res = await resetPassword(prev, formData);
    if (res?.ok) setStep("done");
    return res;
  }, undefined);

  function handleResend() {
    if (!email) return;
    const fd = new FormData();
    fd.set("email", email);
    reqAction(fd);
  }

  if (step === "done") {
    return (
      <div className="mt-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
          Password updated
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your password has been reset. You can now sign in with your new
          password.
        </p>
        <Link
          href="/login"
          className={buttonClasses({
            variant: "primary",
            size: "md",
            className: "mt-6 w-full",
          })}
        >
          Back to sign in
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <StepIndicator current={step} />

      {step === "email" ? (
        <form action={reqAction} className="space-y-4" noValidate>
          <Field
            id="email"
            label="Work email"
            type="email"
            placeholder="jane@acme.co"
            autoComplete="email"
            required
            defaultValue={email}
            error={reqState?.errors?.email}
            hint="We'll send a 6-digit verification code to this address."
          />

          <ErrorAlert message={reqState?.formError} />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="mt-2 w-full"
            disabled={reqPending}
            aria-busy={reqPending}
          >
            {reqPending ? "Sending code…" : "Send reset code"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form action={verifyAction} className="space-y-4" noValidate>
          <input type="hidden" name="email" value={email} />

          <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              If an account exists for <strong>{email}</strong>, we&apos;ve sent
              a 6-digit code. Enter it below.
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
            className="mt-2 w-full"
            disabled={verifyPending}
            aria-busy={verifyPending}
          >
            {verifyPending ? "Verifying…" : "Verify code"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>

          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => setStep("email")}
              className="font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={reqPending}
              className="font-medium text-zinc-900 underline-offset-2 hover:underline disabled:opacity-60 dark:text-zinc-100"
            >
              {reqPending ? "Resending…" : "Resend code"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "reset" ? (
        <form action={resetAction} className="space-y-4" noValidate>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />

          <Field
            id="password"
            label="New password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            error={resetState?.errors?.password}
            hint="Use at least 8 characters."
          />

          <ErrorAlert message={resetState?.formError} />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="mt-2 w-full"
            disabled={resetPending}
            aria-busy={resetPending}
          >
            {resetPending ? "Updating…" : "Update password"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </form>
      ) : null}

      <p className="pt-6 text-center text-[11px] text-zinc-500 dark:text-zinc-500">
        Protected by industry-standard encryption. Your data stays yours.
      </p>
    </div>
  );
}
