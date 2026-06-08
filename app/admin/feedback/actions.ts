"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import Feedback from "@/models/feedback";
import { isFeedbackStatus, type FeedbackStatus } from "@/lib/feedback";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export type FeedbackActionResult = { ok: true } | { ok: false; error: string };

export async function setFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<FeedbackActionResult> {
  await requirePlatformAdmin();

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    return { ok: false, error: "Invalid feedback." };
  }
  if (!isFeedbackStatus(status)) {
    return { ok: false, error: "Invalid status." };
  }

  await connectDB();
  const updated = await Feedback.findByIdAndUpdate(feedbackId, {
    $set: { status },
  });
  if (!updated) {
    return { ok: false, error: "Feedback not found." };
  }

  revalidatePath("/admin/feedback");
  return { ok: true };
}

export async function deleteFeedback(
  feedbackId: string,
): Promise<FeedbackActionResult> {
  await requirePlatformAdmin();

  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    return { ok: false, error: "Invalid feedback." };
  }

  await connectDB();
  const deleted = await Feedback.findByIdAndDelete(feedbackId);
  if (!deleted) {
    return { ok: false, error: "Feedback not found." };
  }

  revalidatePath("/admin/feedback");
  return { ok: true };
}
