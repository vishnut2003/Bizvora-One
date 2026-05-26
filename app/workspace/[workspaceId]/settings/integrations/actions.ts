"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Integration, {
  type IntegrationStatus,
  INTEGRATION_STATUSES,
} from "@/models/integration";
import Workspace from "@/models/workspace";
import { canManageIntegrations, generateWebhookKey } from "@/lib/integration";
import { getActorRole } from "@/lib/workspace-access";

export type IntegrationActionState =
  | { ok?: boolean; formError?: string }
  | undefined;

async function authorize(
  workspaceId: string,
): Promise<{ userId: string } | { formError: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }
  await connectDB();
  const workspace = await Workspace.findById(workspaceId).select(
    "owner members",
  );
  if (!workspace) return { formError: "Workspace not found." };
  const role = getActorRole(workspace, session.user.id);
  if (!canManageIntegrations(role)) {
    return { formError: "You don't have permission to manage integrations." };
  }
  return { userId: session.user.id };
}

export async function regenerateGoogleAdsKey(
  workspaceId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const result = await Integration.updateOne(
    { workspace: workspaceId, provider: "google_ads" },
    { $set: { webhookKey: generateWebhookKey() } },
  );
  if (result.matchedCount === 0) {
    return { formError: "Google Ads integration isn't connected yet." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function setGoogleAdsStatus(
  workspaceId: string,
  status: IntegrationStatus,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  if (!(INTEGRATION_STATUSES as readonly string[]).includes(status)) {
    return { formError: "Invalid status." };
  }

  const result = await Integration.updateOne(
    { workspace: workspaceId, provider: "google_ads" },
    { $set: { status } },
  );
  if (result.matchedCount === 0) {
    return { formError: "Google Ads integration isn't connected yet." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function disconnectGoogleAds(
  workspaceId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  await Integration.deleteOne({
    workspace: workspaceId,
    provider: "google_ads",
  });

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Web Forms
// ----------------------------------------------------------------------------

export async function connectWebForm(
  workspaceId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  // Idempotent: if it already exists, do nothing.
  const existing = await Integration.findOne({
    workspace: workspaceId,
    provider: "web_form",
  });
  if (!existing) {
    await Integration.create({
      workspace: workspaceId,
      provider: "web_form",
      webhookKey: generateWebhookKey(),
      defaults: { priority: "medium", tags: [] },
      status: "active",
      connectedBy: guard.userId,
    });
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function regenerateWebFormKey(
  workspaceId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const result = await Integration.updateOne(
    { workspace: workspaceId, provider: "web_form" },
    { $set: { webhookKey: generateWebhookKey() } },
  );
  if (result.matchedCount === 0) {
    return { formError: "Web Form integration isn't connected yet." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function setWebFormStatus(
  workspaceId: string,
  status: IntegrationStatus,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  if (!(INTEGRATION_STATUSES as readonly string[]).includes(status)) {
    return { formError: "Invalid status." };
  }

  const result = await Integration.updateOne(
    { workspace: workspaceId, provider: "web_form" },
    { $set: { status } },
  );
  if (result.matchedCount === 0) {
    return { formError: "Web Form integration isn't connected yet." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function disconnectWebForm(
  workspaceId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  await Integration.deleteOne({
    workspace: workspaceId,
    provider: "web_form",
  });

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}
