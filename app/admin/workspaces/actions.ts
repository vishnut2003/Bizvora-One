"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { WORKSPACE_STATUSES, type WorkspaceStatus } from "@/lib/workspace";

export type SetWorkspaceStatusResult = { ok: true } | { ok: false; error: string };

function isWorkspaceStatus(value: string): value is WorkspaceStatus {
  return (WORKSPACE_STATUSES as readonly string[]).includes(value);
}

export async function setWorkspaceStatus(
  workspaceId: string,
  status: string,
): Promise<SetWorkspaceStatusResult> {
  await requirePlatformAdmin();

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, error: "Invalid workspace." };
  }
  if (!isWorkspaceStatus(status)) {
    return { ok: false, error: "Invalid status." };
  }

  await connectDB();
  const result = await Workspace.updateOne(
    { _id: workspaceId },
    { $set: { status } },
  );
  if (result.matchedCount === 0) {
    return { ok: false, error: "Workspace not found." };
  }

  revalidatePath("/admin/workspaces");
  return { ok: true };
}

export type SetWorkspaceMaxMembersResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setWorkspaceMaxMembers(
  workspaceId: string,
  maxMembers: number | null,
): Promise<SetWorkspaceMaxMembersResult> {
  await requirePlatformAdmin();

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, error: "Invalid workspace." };
  }

  if (maxMembers !== null) {
    if (!Number.isInteger(maxMembers) || maxMembers < 1) {
      return { ok: false, error: "Enter a whole number of 1 or more." };
    }
  }

  await connectDB();
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { ok: false, error: "Workspace not found." };
  }

  const memberCount = workspace.members?.length ?? 0;
  if (maxMembers !== null && maxMembers < memberCount) {
    return {
      ok: false,
      error: `Limit can't be below the current ${memberCount} member${memberCount === 1 ? "" : "s"}.`,
    };
  }

  workspace.maxMembers = maxMembers;
  await workspace.save();

  revalidatePath("/admin/workspaces");
  return { ok: true };
}
