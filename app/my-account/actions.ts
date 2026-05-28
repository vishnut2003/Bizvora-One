"use server";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import {
  cancelRazorpaySubscription,
  createRazorpaySubscription,
} from "@/lib/razorpay";
import { BILLING_PERIOD_TOTAL_COUNT } from "@/lib/billing";
import User from "@/models/user";
import Plan from "@/models/plan";
import Subscription from "@/models/subscription";
import Workspace from "@/models/workspace";

export type UpdateProfileNameState =
  | {
      ok?: boolean;
      errors?: { name?: string };
      formError?: string;
    }
  | undefined;

export type UpdatePasswordState =
  | {
      ok?: boolean;
      errors?: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      };
      formError?: string;
    }
  | undefined;

export async function updateProfileName(
  _prev: UpdateProfileNameState,
  formData: FormData,
): Promise<UpdateProfileNameState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) {
    return { errors: { name: "Name must be between 2 and 60 characters." } };
  }

  await connectDB();
  await User.updateOne({ _id: session.user.id }, { $set: { name } });
  revalidatePath("/my-account/profile");
  return { ok: true };
}

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors: NonNullable<UpdatePasswordState>["errors"] = {};
  if (newPassword.length < 8)
    errors.newPassword = "Password must be at least 8 characters.";
  if (newPassword !== confirmPassword)
    errors.confirmPassword = "Passwords don't match.";
  if (Object.keys(errors).length) return { errors };

  await connectDB();
  const user = await User.findById(session.user.id).select("+password");
  if (!user) return { formError: "Account not found." };

  const hasCredentials = user.providers?.includes("credentials");

  if (hasCredentials) {
    if (!currentPassword) {
      return {
        errors: { currentPassword: "Enter your current password." },
      };
    }
    const ok = user.password
      ? await bcrypt.compare(currentPassword, user.password)
      : false;
    if (!ok) {
      return {
        errors: { currentPassword: "Current password is incorrect." },
      };
    }
  }

  user.password = await bcrypt.hash(newPassword, 10);
  if (!hasCredentials) {
    user.providers = [...(user.providers ?? []), "credentials"];
  }
  await user.save();

  return { ok: true };
}

export type UnlinkGoogleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function unlinkGoogleAccount(): Promise<UnlinkGoogleResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("+password");
  if (!user) return { ok: false, error: "Account not found." };

  const hasCredentials = user.providers?.includes("credentials");
  if (!hasCredentials || !user.password) {
    return {
      ok: false,
      error:
        "Set a password first — otherwise you'll be locked out of your account.",
    };
  }

  user.googleId = null;
  user.providers = (user.providers ?? []).filter(
    (p) => p !== "google",
  ) as typeof user.providers;
  // Clear Google-sourced avatar so the UI falls back to initials.
  user.image = null;
  await user.save();

  revalidatePath("/my-account/profile");
  return { ok: true };
}

export type CancelSubscriptionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelSubscription(
  workspaceId: string,
): Promise<CancelSubscriptionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, error: "Invalid workspace." };
  }

  await connectDB();
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    owner: session.user.id,
  });
  if (!workspace) {
    return { ok: false, error: "Workspace not found." };
  }

  const sub = await Subscription.findOne({ workspace: workspace._id });
  if (!sub) {
    return { ok: false, error: "No active subscription on this workspace." };
  }

  if (sub.status !== "active" && sub.status !== "authenticated") {
    return { ok: false, error: "Subscription is not active." };
  }

  try {
    await cancelRazorpaySubscription(sub.razorpaySubscriptionId, true);
  } catch (err) {
    console.error("[my-account] cancel failed:", err);
    return {
      ok: false,
      error: "Couldn't cancel the subscription. Try again in a moment.",
    };
  }

  sub.cancelAtPeriodEnd = true;
  sub.cancelledAt = new Date();
  await sub.save();

  revalidatePath("/my-account/subscriptions");
  return { ok: true };
}

export type ResumeSubscriptionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resumeSubscription(): Promise<ResumeSubscriptionResult> {
  // V1: Razorpay has no un-cancel API. Users must contact support.
  return {
    ok: false,
    error:
      "Resuming a cancelled subscription isn't self-serve yet. Please contact support.",
  };
}

export type ChangePlanResult = { ok: true } | { ok: false; error: string };

// Razorpay does not let us mutate plan_id on a live subscription. We cancel
// the current one at cycle end and create a new one scheduled to start when
// the current cycle ends. Until the new one activates, we surface the swap
// on the subscription doc so the UI can show "switches to <plan> on <date>".
export async function changePlan(
  workspaceId: string,
  newPlanId: string,
): Promise<ChangePlanResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(newPlanId)
  ) {
    return { ok: false, error: "Invalid request." };
  }

  await connectDB();
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    owner: session.user.id,
  });
  if (!workspace) {
    return { ok: false, error: "Workspace not found." };
  }

  const sub = await Subscription.findOne({ workspace: workspace._id });
  if (!sub) {
    return { ok: false, error: "No subscription on this workspace." };
  }
  if (sub.status !== "active") {
    return {
      ok: false,
      error: "Only an active subscription can be switched.",
    };
  }
  if (String(sub.plan) === newPlanId) {
    return { ok: false, error: "You're already on this plan." };
  }
  if (sub.pendingPlanSwap) {
    return {
      ok: false,
      error: "A plan switch is already pending. Wait for it to take effect.",
    };
  }
  if (!sub.currentPeriodEnd) {
    return {
      ok: false,
      error: "Can't determine the current cycle end. Try again shortly.",
    };
  }

  const newPlan = await Plan.findOne({
    _id: newPlanId,
    visible: true,
    archived: false,
  });
  if (!newPlan) {
    return { ok: false, error: "That plan is no longer available." };
  }

  // Cancel current at cycle end so charges continue until the swap date.
  try {
    await cancelRazorpaySubscription(sub.razorpaySubscriptionId, true);
  } catch (err) {
    console.error("[changePlan] cancel current failed:", err);
    return {
      ok: false,
      error: "Couldn't schedule the switch. Try again in a moment.",
    };
  }

  // Create the new subscription scheduled to start when the current ends.
  const startAtUnix = Math.floor(sub.currentPeriodEnd.getTime() / 1000);
  let created;
  try {
    created = await createRazorpaySubscription({
      razorpayPlanId: newPlan.razorpayPlanId,
      quantity: sub.quantity,
      totalCount: BILLING_PERIOD_TOTAL_COUNT[newPlan.period],
      startAt: startAtUnix,
      notes: {
        workspaceId: String(workspace._id),
        ownerId: String(session.user.id),
        replaces: sub.razorpaySubscriptionId,
      },
    });
  } catch (err) {
    console.error("[changePlan] create new failed:", err);
    return {
      ok: false,
      error:
        "Cancelled the current plan but couldn't create the new one. Contact support.",
    };
  }

  sub.cancelAtPeriodEnd = true;
  sub.pendingPlanSwap = {
    newPlan: newPlan._id,
    newPlanName: newPlan.name,
    newRazorpaySubscriptionId: created.id,
    scheduledAt: sub.currentPeriodEnd,
  };
  await sub.save();

  revalidatePath("/my-account/subscriptions");
  return { ok: true };
}
