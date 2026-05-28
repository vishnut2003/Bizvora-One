import "server-only";
import Razorpay from "razorpay";
import type { BillingPeriod } from "@/lib/billing";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in environment variables`);
  return value;
}

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: requireEnv("RAZORPAY_KEY_ID"),
      key_secret: requireEnv("RAZORPAY_KEY_SECRET"),
    });
  }
  return client;
}

// Returns the public key id (passed to client-side Checkout.js via a server
// action return value, so it doesn't need to be `NEXT_PUBLIC_`).
export function getRazorpayPublicKey(): string {
  return requireEnv("RAZORPAY_KEY_ID");
}

// Razorpay's SDK ships a static signature validator. We wrap it so callers don't
// import the SDK class directly, and so we can swallow any unexpected throws.
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  try {
    return Razorpay.validateWebhookSignature(
      rawBody,
      signature,
      requireEnv("RAZORPAY_WEBHOOK_SECRET"),
    );
  } catch {
    return false;
  }
}

export type CreateRazorpayPlanParams = {
  name: string;
  amount: number; // paise per seat per period
  currency?: string;
  period: BillingPeriod;
  interval?: number;
  notes?: Record<string, string | number>;
};

export async function createRazorpayPlan(
  params: CreateRazorpayPlanParams,
): Promise<string> {
  const created = await razorpay().plans.create({
    period: params.period,
    interval: params.interval ?? 1,
    item: {
      name: params.name,
      amount: params.amount,
      currency: params.currency ?? "INR",
    },
    notes: params.notes,
  });
  return created.id;
}

export type CreateRazorpaySubscriptionParams = {
  razorpayPlanId: string;
  quantity: number;
  totalCount: number;
  notes?: Record<string, string | number>;
  startAt?: number; // unix seconds
};

export async function createRazorpaySubscription(
  params: CreateRazorpaySubscriptionParams,
): Promise<{ id: string; shortUrl: string; status: string }> {
  const created = await razorpay().subscriptions.create({
    plan_id: params.razorpayPlanId,
    total_count: params.totalCount,
    quantity: params.quantity,
    customer_notify: 1,
    notes: params.notes,
    ...(params.startAt ? { start_at: params.startAt } : {}),
  });
  return {
    id: created.id,
    shortUrl: created.short_url,
    status: created.status,
  };
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return razorpay().subscriptions.fetch(subscriptionId);
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true,
) {
  return razorpay().subscriptions.cancel(
    subscriptionId,
    cancelAtCycleEnd ? 1 : 0,
  );
}

export async function updateRazorpaySubscriptionQuantity(
  subscriptionId: string,
  quantity: number,
) {
  return razorpay().subscriptions.update(subscriptionId, {
    quantity,
    schedule_change_at: "now",
  });
}
