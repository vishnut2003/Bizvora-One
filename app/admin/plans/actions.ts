"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { BILLING_PERIODS, isBillingPeriod } from "@/lib/billing";
import { createRazorpayPlan } from "@/lib/razorpay";
import Plan from "@/models/plan";

export type CreatePlanState =
  | {
      ok?: boolean;
      errors?: {
        name?: string;
        amount?: string;
        period?: string;
        interval?: string;
      };
      formError?: string;
    }
  | undefined;

export type UpdatePlanState =
  | {
      ok?: boolean;
      errors?: {
        name?: string;
        badge?: string;
        sortOrder?: string;
      };
      formError?: string;
    }
  | undefined;

export async function createPlan(
  _prev: CreatePlanState,
  formData: FormData,
): Promise<CreatePlanState> {
  await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountRupees = Number(formData.get("amountRupees"));
  const periodInput = String(formData.get("period") ?? "");
  const intervalInput = Number(formData.get("interval") ?? 1);
  const badge = String(formData.get("badge") ?? "").trim();
  const featured = formData.get("featured") === "on";
  const visible = formData.get("visible") !== "off";
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  const errors: NonNullable<CreatePlanState>["errors"] = {};
  if (name.length < 2 || name.length > 60)
    errors.name = "Name must be between 2 and 60 characters.";
  if (!Number.isFinite(amountRupees) || amountRupees < 1)
    errors.amount = "Amount must be at least ₹1.";
  if (!isBillingPeriod(periodInput))
    errors.period = `Period must be one of: ${BILLING_PERIODS.join(", ")}.`;
  if (!Number.isInteger(intervalInput) || intervalInput < 1)
    errors.interval = "Interval must be a positive whole number.";

  if (Object.keys(errors).length) return { errors };

  await connectDB();

  const amount = Math.round(amountRupees * 100);
  const period = periodInput as (typeof BILLING_PERIODS)[number];

  let razorpayPlanId: string;
  try {
    razorpayPlanId = await createRazorpayPlan({
      name,
      amount,
      period,
      interval: intervalInput,
      notes: { source: "wss-crm admin" },
    });
  } catch (err) {
    console.error("[admin/plans] razorpay create failed:", err);
    return {
      formError:
        "Couldn't create the plan in Razorpay. Check API credentials and try again.",
    };
  }

  try {
    await Plan.create({
      razorpayPlanId,
      amount,
      currency: "INR",
      period,
      interval: intervalInput,
      name,
      description,
      badge,
      featured,
      visible,
      archived: false,
      sortOrder,
      trialDays: 0,
    });
  } catch (err) {
    console.error("[admin/plans] persist failed:", err);
    return {
      formError:
        "The plan was created in Razorpay but we couldn't save it locally. Contact support to reconcile.",
    };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true };
}

export async function updatePlanMetadata(
  _prev: UpdatePlanState,
  formData: FormData,
): Promise<UpdatePlanState> {
  await requirePlatformAdmin();

  const planId = String(formData.get("planId") ?? "");
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { formError: "Invalid plan." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const badge = String(formData.get("badge") ?? "").trim();
  const featured = formData.get("featured") === "on";
  const visible = formData.get("visible") !== "off";
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  const errors: NonNullable<UpdatePlanState>["errors"] = {};
  if (name.length < 2 || name.length > 60)
    errors.name = "Name must be between 2 and 60 characters.";
  if (badge.length > 24) errors.badge = "Badge must be 24 characters or fewer.";
  if (!Number.isFinite(sortOrder))
    errors.sortOrder = "Sort order must be a number.";
  if (Object.keys(errors).length) return { errors };

  await connectDB();
  const result = await Plan.updateOne(
    { _id: planId },
    {
      $set: {
        name,
        description,
        badge,
        featured,
        visible,
        sortOrder,
      },
    },
  );
  if (result.matchedCount === 0) {
    return { formError: "Plan not found." };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true };
}

export type ArchivePlanResult = { ok: true } | { ok: false; error: string };

export async function archivePlan(planId: string): Promise<ArchivePlanResult> {
  await requirePlatformAdmin();
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { ok: false, error: "Invalid plan." };
  }
  await connectDB();
  const result = await Plan.updateOne(
    { _id: planId },
    { $set: { archived: true, visible: false } },
  );
  if (result.matchedCount === 0) return { ok: false, error: "Plan not found." };
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true };
}

export async function unarchivePlan(
  planId: string,
): Promise<ArchivePlanResult> {
  await requirePlatformAdmin();
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return { ok: false, error: "Invalid plan." };
  }
  await connectDB();
  const result = await Plan.updateOne(
    { _id: planId },
    { $set: { archived: false } },
  );
  if (result.matchedCount === 0) return { ok: false, error: "Plan not found." };
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true };
}
