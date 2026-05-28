"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/button";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  startWorkspaceCheckout,
  type StartCheckoutState,
} from "../actions";

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type CheckoutButtonProps = {
  workspaceId: string;
  planId: string;
  workspaceName: string;
  planLabel: string;
  prefill: { name: string; email: string };
};

export default function CheckoutButton({
  workspaceId,
  planId,
  workspaceName,
  planLabel,
  prefill,
}: CheckoutButtonProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<StartCheckoutState, FormData>(
    startWorkspaceCheckout,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Open the Razorpay modal once the server action returns a subscription id.
  useEffect(() => {
    if (!state?.ok || !state.subscriptionId || !state.keyId) return;

    let cancelled = false;
    (async () => {
      setOpening(true);
      const ok = await loadRazorpayScript();
      if (cancelled) return;
      if (!ok || !window.Razorpay) {
        setScriptError(
          "Couldn't load the payment widget. Check your connection and try again.",
        );
        setOpening(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: state.keyId,
        subscription_id: state.subscriptionId,
        name: "WSS CRM",
        description: `${planLabel} plan — ${workspaceName}`,
        prefill: {
          name: prefill.name || undefined,
          email: prefill.email || undefined,
        },
        notes: { workspaceId, planId },
        theme: { color: "#8e51ff" },
        handler: () => {
          router.push(`/workspace/${workspaceId}?paid=1`);
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            setOpening(false);
          },
        },
      });
      rzp.open();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    state,
    workspaceId,
    planId,
    workspaceName,
    planLabel,
    prefill,
    router,
  ]);

  const submit = (formData: FormData) => {
    setScriptError(null);
    startTransition(() => formAction(formData));
  };

  const busy = isPending || opening;

  return (
    <form action={submit} className="mt-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="planId" value={planId} />

      <button
        type="submit"
        disabled={busy}
        className={buttonClasses({
          variant: "primary",
          size: "md",
          className: "w-full",
        })}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Opening secure checkout…
          </>
        ) : (
          <>
            Pay now
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {state?.formError ? (
        <p
          role="alert"
          className="mt-3 text-center text-sm text-rose-600 dark:text-rose-400"
        >
          {state.formError}
        </p>
      ) : null}
      {scriptError ? (
        <p
          role="alert"
          className="mt-3 text-center text-sm text-rose-600 dark:text-rose-400"
        >
          {scriptError}
        </p>
      ) : null}
    </form>
  );
}
