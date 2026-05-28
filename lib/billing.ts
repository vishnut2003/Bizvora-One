export const BILLING_PERIODS = ["monthly", "yearly"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const SUBSCRIPTION_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "completed",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isBillingPeriod(value: string): value is BillingPeriod {
  return (BILLING_PERIODS as readonly string[]).includes(value);
}

// Whether the subscription is currently entitling the workspace. The webhook
// flips workspace.status off when status leaves this set.
export function isSubscriptionEntitling(status: SubscriptionStatus): boolean {
  return status === "active" || status === "authenticated";
}

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  created: "Awaiting payment",
  authenticated: "Activating",
  active: "Active",
  pending: "Retrying payment",
  halted: "Halted",
  cancelled: "Cancelled",
  completed: "Completed",
  expired: "Expired",
};

export const SUBSCRIPTION_STATUS_BADGE_CLASS: Record<SubscriptionStatus, string> =
  {
    created:
      "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
    authenticated:
      "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
    active:
      "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
    pending:
      "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
    halted:
      "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
    cancelled:
      "bg-zinc-200 text-zinc-700 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:ring-zinc-600/40",
    completed:
      "bg-zinc-200 text-zinc-700 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:ring-zinc-600/40",
    expired:
      "bg-zinc-200 text-zinc-700 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:ring-zinc-600/40",
  };

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "month",
  yearly: "year",
};

// Razorpay's total_count caps the number of billing cycles. We pick large
// numbers so subscriptions effectively run forever (Razorpay requires a value).
export const BILLING_PERIOD_TOTAL_COUNT: Record<BillingPeriod, number> = {
  monthly: 120, // 10 years
  yearly: 10, // 10 years
};

export function formatPaise(amount: number, currency = "INR"): string {
  const rupees = amount / 100;
  if (currency === "INR") {
    return `₹${rupees.toLocaleString("en-IN", {
      minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${rupees.toLocaleString()} ${currency}`;
}
