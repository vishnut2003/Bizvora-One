import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import type { SubscriptionStatus } from "@/lib/billing";
import Subscription from "@/models/subscription";
import Workspace from "@/models/workspace";
import User from "@/models/user";
import Plan from "@/models/plan";
import WebhookEvent from "@/models/webhook-event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Razorpay retries on non-2xx. We almost always return 200 (after logging
// internal failures) so they stop retrying. Signature failures are the one
// exception — those return 401.
function ok(extra: Record<string, unknown> = {}) {
  return Response.json({ ok: true, ...extra });
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

type RazorpaySubscriptionEntity = {
  id: string;
  status: string;
  customer_id?: string | null;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  ended_at?: number | null;
  notes?: Record<string, string>;
};

type RazorpayPaymentEntity = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_id?: string | null;
  created_at?: number;
};

type RazorpayInvoiceEntity = {
  id: string;
  payment_id?: string | null;
  amount: number;
  amount_paid?: number;
  currency: string;
  status: string;
  date?: number;
  paid_at?: number | null;
  short_url?: string | null;
  subscription_id?: string | null;
  period_start?: number | null;
  period_end?: number | null;
};

type RazorpayEvent = {
  id?: string;
  event: string;
  created_at: number;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
    invoice?: { entity: RazorpayInvoiceEntity };
  };
};

function toDate(unix: number | null | undefined): Date | null {
  return typeof unix === "number" ? new Date(unix * 1000) : null;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return ok({ ignored: "invalid_json" });
  }

  await connectDB();

  // Idempotency: bail if we've already processed this event.
  const eventId =
    event.id ||
    `${event.event}:${event.created_at}:${
      event.payload?.subscription?.entity?.id ?? "unknown"
    }`;
  try {
    await WebhookEvent.create({ provider: "razorpay", eventId });
  } catch (err) {
    if (isDuplicateKeyError(err)) return ok({ duplicate: true });
    console.error("[razorpay-webhook] event log insert failed:", err);
    // Fall through — better to risk a double-process than to drop the event.
  }

  try {
    switch (event.event) {
      case "subscription.authenticated":
        await handleAuthenticated(event);
        break;
      case "subscription.activated":
        await handleActivated(event);
        break;
      case "subscription.charged":
        await handleCharged(event);
        break;
      case "subscription.pending":
        await updateSubStatus(event, "pending");
        break;
      case "subscription.halted":
        await handleHalted(event);
        break;
      case "subscription.cancelled":
        await handleCancelled(event);
        break;
      case "subscription.completed":
        await handleCompleted(event);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event);
        break;
      case "payment.failed":
        // V1: log only. Phase 2: attach to latest invoice on the subscription.
        console.warn("[razorpay-webhook] payment.failed:", event.payload.payment?.entity?.id);
        break;
      default:
        // Unknown event — ack and move on.
        break;
    }
  } catch (err) {
    console.error(
      `[razorpay-webhook] handler for ${event.event} failed:`,
      err,
    );
    return ok({ handled: false, error: "handler_failed" });
  }

  return ok();
}

async function findSubscription(event: RazorpayEvent) {
  const id = event.payload.subscription?.entity?.id;
  if (!id) return null;
  // Also match when this event refers to a queued plan-swap subscription so
  // we can swap the references atomically once the new one activates.
  return Subscription.findOne({
    $or: [
      { razorpaySubscriptionId: id },
      { "pendingPlanSwap.newRazorpaySubscriptionId": id },
    ],
  });
}

// Perform the plan-swap swap: when a queued plan-switch subscription
// activates, take over its identity onto the Subscription doc and clear the
// pending swap. The old razorpay subscription is by now completed/cancelled
// (it ran out at cycle end).
async function applyPendingPlanSwapIfMatches(
  sub: NonNullable<Awaited<ReturnType<typeof findSubscription>>>,
  incomingSubscriptionId: string,
) {
  const swap = sub.pendingPlanSwap;
  if (!swap || swap.newRazorpaySubscriptionId !== incomingSubscriptionId) {
    return false;
  }
  const newPlan = await Plan.findById(swap.newPlan).lean();
  sub.razorpaySubscriptionId = incomingSubscriptionId;
  if (newPlan) {
    sub.plan = newPlan._id;
    sub.razorpayPlanId = newPlan.razorpayPlanId;
    sub.unitAmount = newPlan.amount;
    sub.period = newPlan.period;
  }
  sub.cancelAtPeriodEnd = false;
  sub.cancelledAt = null;
  sub.pendingPlanSwap = null;
  return true;
}

function applySubscriptionEntity(
  doc: Awaited<ReturnType<typeof findSubscription>>,
  entity: RazorpaySubscriptionEntity,
  eventId: string,
) {
  if (!doc) return;
  doc.lastEventId = eventId;
  if (entity.customer_id) doc.razorpayCustomerId = entity.customer_id;
  doc.currentPeriodStart = toDate(entity.current_start);
  doc.currentPeriodEnd = toDate(entity.current_end);
  doc.nextChargeAt = toDate(entity.charge_at);
  if (entity.ended_at) doc.endedAt = toDate(entity.ended_at);
}

async function setWorkspaceStatus(
  workspaceId: unknown,
  status: "active" | "suspended" | "pending_payment",
) {
  await Workspace.updateOne({ _id: workspaceId }, { $set: { status } });
}

async function handleAuthenticated(event: RazorpayEvent) {
  const sub = await findSubscription(event);
  if (!sub) return;
  const entity = event.payload.subscription!.entity;
  sub.status = "authenticated";
  applySubscriptionEntity(sub, entity, event.id ?? "");

  // First time we see the customer id — back-fill it onto the owner.
  if (entity.customer_id) {
    await User.updateOne(
      { _id: sub.owner, razorpayCustomerId: { $in: [null, "", undefined] } },
      { $set: { razorpayCustomerId: entity.customer_id } },
    );
  }
  await sub.save();
}

async function handleActivated(event: RazorpayEvent) {
  const sub = await findSubscription(event);
  if (!sub) return;
  const entity = event.payload.subscription!.entity;

  // If this is the queued post-swap subscription activating, swap references
  // before applying the status update.
  await applyPendingPlanSwapIfMatches(sub, entity.id);

  sub.status = "active";
  applySubscriptionEntity(sub, entity, event.id ?? "");
  if (entity.customer_id) {
    await User.updateOne(
      { _id: sub.owner, razorpayCustomerId: { $in: [null, "", undefined] } },
      { $set: { razorpayCustomerId: entity.customer_id } },
    );
  }
  await sub.save();

  await setWorkspaceStatus(sub.workspace, "active");
  revalidatePath("/workspace");
  revalidatePath(`/workspace/${String(sub.workspace)}`);
  revalidatePath("/my-account/subscriptions");
}

async function handleCharged(event: RazorpayEvent) {
  const sub = await findSubscription(event);
  if (!sub) return;
  const entity = event.payload.subscription!.entity;
  sub.status = "active";
  applySubscriptionEntity(sub, entity, event.id ?? "");

  const payment = event.payload.payment?.entity;
  if (payment) {
    appendInvoice(sub, {
      razorpayInvoiceId: payment.invoice_id || `pay_${payment.id}`,
      razorpayPaymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status === "captured" ? "paid" : payment.status,
      periodStart: toDate(entity.current_start),
      periodEnd: toDate(entity.current_end),
      issuedAt: toDate(payment.created_at) ?? new Date(),
      paidAt: payment.status === "captured" ? new Date() : null,
      hostedInvoiceUrl: null,
    });
  }
  await sub.save();
  await setWorkspaceStatus(sub.workspace, "active");
}

async function handleHalted(event: RazorpayEvent) {
  const sub = await findSubscription(event);
  if (!sub) return;
  sub.status = "halted";
  applySubscriptionEntity(sub, event.payload.subscription!.entity, event.id ?? "");
  await sub.save();
  await setWorkspaceStatus(sub.workspace, "suspended");
  revalidatePath("/workspace");
}

async function handleCancelled(event: RazorpayEvent) {
  const sub = await findSubscription(event);
  if (!sub) return;
  const entity = event.payload.subscription!.entity;

  // Razorpay fires `subscription.cancelled` for both immediate AND
  // cycle-end cancels. For cycle-end cancels the entity stays `active`
  // until the cycle ends (then `subscription.completed` fires). Only flip
  // the workspace to suspended on a true immediate cancel.
  if (entity.status === "cancelled") {
    sub.status = "cancelled";
    sub.cancelledAt = sub.cancelledAt || new Date();
  } else {
    sub.cancelAtPeriodEnd = true;
    sub.cancelledAt = sub.cancelledAt || new Date();
  }
  applySubscriptionEntity(sub, entity, event.id ?? "");
  await sub.save();

  if (entity.status === "cancelled") {
    await setWorkspaceStatus(sub.workspace, "suspended");
    revalidatePath("/workspace");
  }
  revalidatePath("/my-account/subscriptions");
}

async function handleCompleted(event: RazorpayEvent) {
  const sub = await findSubscription(event);
  if (!sub) return;
  const entity = event.payload.subscription!.entity;

  // If a plan swap is pending and this completed event is for the OLD
  // subscription that's being replaced, do not suspend the workspace — the
  // new subscription is taking over.
  const swap = sub.pendingPlanSwap;
  const isOldSubInSwap =
    swap !== null &&
    swap !== undefined &&
    swap.newRazorpaySubscriptionId !== entity.id &&
    sub.razorpaySubscriptionId === entity.id;
  if (isOldSubInSwap) {
    sub.lastEventId = event.id ?? sub.lastEventId;
    await sub.save();
    return;
  }

  sub.status = "completed";
  sub.endedAt = sub.endedAt || new Date();
  applySubscriptionEntity(sub, entity, event.id ?? "");
  await sub.save();
  await setWorkspaceStatus(sub.workspace, "suspended");
  revalidatePath("/workspace");
  revalidatePath("/my-account/subscriptions");
}

async function updateSubStatus(event: RazorpayEvent, status: SubscriptionStatus) {
  const sub = await findSubscription(event);
  if (!sub) return;
  sub.status = status;
  applySubscriptionEntity(sub, event.payload.subscription!.entity, event.id ?? "");
  await sub.save();
}

async function handleInvoicePaid(event: RazorpayEvent) {
  const invoice = event.payload.invoice?.entity;
  if (!invoice || !invoice.subscription_id) return;
  const sub = await Subscription.findOne({
    razorpaySubscriptionId: invoice.subscription_id,
  });
  if (!sub) return;

  appendInvoice(sub, {
    razorpayInvoiceId: invoice.id,
    razorpayPaymentId: invoice.payment_id ?? null,
    amount: invoice.amount_paid ?? invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    periodStart: toDate(invoice.period_start),
    periodEnd: toDate(invoice.period_end),
    issuedAt: toDate(invoice.date) ?? new Date(),
    paidAt: toDate(invoice.paid_at),
    hostedInvoiceUrl: invoice.short_url ?? null,
  });
  sub.lastEventId = event.id ?? sub.lastEventId;
  await sub.save();
}

type InvoiceLine = {
  razorpayInvoiceId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  issuedAt: Date;
  paidAt: Date | null;
  hostedInvoiceUrl: string | null;
};

function appendInvoice(
  sub: NonNullable<Awaited<ReturnType<typeof findSubscription>>>,
  line: InvoiceLine,
) {
  const existing = sub.invoices.find(
    (i) => i.razorpayInvoiceId === line.razorpayInvoiceId,
  );
  if (existing) {
    // Upsert — later events (invoice.paid after subscription.charged) overwrite.
    Object.assign(existing, line);
    return;
  }
  sub.invoices.push(line);
}
