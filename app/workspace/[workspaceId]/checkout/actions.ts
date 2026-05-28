"use server";

import mongoose from "mongoose";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import { createRazorpaySubscription, getRazorpayPublicKey } from "@/lib/razorpay";
import { BILLING_PERIOD_TOTAL_COUNT } from "@/lib/billing";
import Workspace from "@/models/workspace";
import Plan from "@/models/plan";
import Subscription from "@/models/subscription";

export type StartCheckoutState = {
  ok?: boolean;
  subscriptionId?: string;
  keyId?: string;
  formError?: string;
};

export async function startWorkspaceCheckout(
  _prev: StartCheckoutState | undefined,
  formData: FormData,
): Promise<StartCheckoutState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const planId = String(formData.get("planId") ?? "");

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(planId)
  ) {
    return { formError: "Invalid checkout request." };
  }

  await connectDB();

  const workspace = await Workspace.findOne({
    _id: workspaceId,
    owner: session.user.id,
  });

  if (!workspace) {
    return { formError: "Workspace not found." };
  }

  const status = workspace.status ?? "active";
  if (status !== "pending_payment") {
    return {
      formError:
        status === "active"
          ? "This workspace is already active."
          : "This workspace can't be activated right now.",
    };
  }

  const plan = await Plan.findOne({
    _id: planId,
    visible: true,
    archived: false,
  });

  if (!plan) {
    return { formError: "That plan is no longer available." };
  }

  const existing = await Subscription.findOne({ workspace: workspace._id });

  // Reuse an in-flight subscription if it points at the same plan — avoids
  // creating orphan subscriptions when the user navigates back to checkout.
  if (
    existing &&
    (existing.status === "created" || existing.status === "authenticated") &&
    String(existing.plan) === String(plan._id)
  ) {
    return {
      ok: true,
      subscriptionId: existing.razorpaySubscriptionId,
      keyId: getRazorpayPublicKey(),
    };
  }

  const seatCount = Math.max(1, workspace.members.length);

  let created: { id: string; shortUrl: string; status: string };
  try {
    created = await createRazorpaySubscription({
      razorpayPlanId: plan.razorpayPlanId,
      quantity: seatCount,
      totalCount: BILLING_PERIOD_TOTAL_COUNT[plan.period],
      notes: {
        workspaceId: String(workspace._id),
        ownerId: String(session.user.id),
      },
    });
  } catch (err) {
    console.error("[razorpay] subscription create failed:", err);
    return {
      formError: "Couldn't start checkout. Please try again in a moment.",
    };
  }

  try {
    if (existing) {
      existing.plan = plan._id;
      existing.razorpayPlanId = plan.razorpayPlanId;
      existing.razorpaySubscriptionId = created.id;
      existing.razorpayCustomerId = existing.razorpayCustomerId || "";
      existing.status = "created";
      existing.quantity = seatCount;
      existing.unitAmount = plan.amount;
      existing.period = plan.period;
      existing.currentPeriodStart = null;
      existing.currentPeriodEnd = null;
      existing.nextChargeAt = null;
      existing.cancelAtPeriodEnd = false;
      existing.cancelledAt = null;
      existing.endedAt = null;
      await existing.save();
    } else {
      await Subscription.create({
        workspace: workspace._id,
        owner: session.user.id,
        plan: plan._id,
        razorpayPlanId: plan.razorpayPlanId,
        razorpayCustomerId: "",
        razorpaySubscriptionId: created.id,
        status: "created",
        quantity: seatCount,
        unitAmount: plan.amount,
        period: plan.period,
      });
    }
  } catch (err) {
    console.error("[razorpay] subscription persist failed:", err);
    return {
      formError:
        "Payment session was created but we couldn't save it. Please contact support.",
    };
  }

  return {
    ok: true,
    subscriptionId: created.id,
    keyId: getRazorpayPublicKey(),
  };
}
