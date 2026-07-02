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
import {
  canManageIntegrations,
  decryptSecret,
  encryptSecret,
  generateWebhookKey,
} from "@/lib/integration";
import { getActorRole } from "@/lib/workspace-access";
import { subscribePageToLeadgen, unsubscribePage } from "@/lib/meta-ads";

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

// ----------------------------------------------------------------------------
// Meta Ads
// ----------------------------------------------------------------------------

// Multi-tenant: each workspace registers its own Meta developer app and saves
// its credentials here before the OAuth connect step. The app secret is
// stored encrypted; the integration's webhookKey doubles as the verify token
// the tenant enters in their Meta App Dashboard webhook config.
export async function saveMetaAppCredentials(
  workspaceId: string,
  appIdInput: string,
  appSecretInput: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const appId = (appIdInput ?? "").trim();
  const appSecret = (appSecretInput ?? "").trim();
  if (!/^\d{5,}$/.test(appId)) {
    return { formError: "That doesn't look like a Meta App ID (numbers only)." };
  }
  if (appSecret.length < 16) {
    return { formError: "That doesn't look like a Meta App Secret." };
  }

  const existing = await Integration.findOne({
    workspace: workspaceId,
    provider: "meta_ads",
  });

  if (!existing) {
    await Integration.create({
      workspace: workspaceId,
      provider: "meta_ads",
      webhookKey: generateWebhookKey(),
      meta: {
        appId,
        appSecret: encryptSecret(appSecret),
        pageId: null,
        pageName: null,
        pageAccessToken: null,
        tokenStatus: "valid",
        pendingPages: [],
      },
      defaults: { priority: "medium", tags: ["meta-ads"] },
      status: "active",
      connectedBy: guard.userId,
    });
  } else {
    const appChanged = existing.meta?.appId !== appId;
    existing.set("meta.appId", appId);
    existing.set("meta.appSecret", encryptSecret(appSecret));
    if (appChanged) {
      // Tokens and page subscriptions belong to the old app — require a
      // fresh OAuth connect against the new one.
      existing.oauth = {
        accountEmail: null,
        refreshToken: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        scopes: [],
      };
      existing.set("meta.pageId", null);
      existing.set("meta.pageName", null);
      existing.set("meta.pageAccessToken", null);
      existing.set("meta.tokenStatus", "valid");
      existing.set("meta.pendingPages", []);
    }
    await existing.save();
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

// Resolves the page picker shown after OAuth when the user manages several
// Facebook Pages: subscribes the chosen page to leadgen and promotes its
// (already encrypted) token out of pendingPages.
export async function selectMetaPage(
  workspaceId: string,
  pageId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "meta_ads",
  });
  if (!integration || !integration.meta) {
    return { formError: "Meta Ads integration isn't connected yet." };
  }

  const page = integration.meta.pendingPages?.find((p) => p.id === pageId);
  if (!page || !page.accessToken) {
    return { formError: "That page isn't available. Try reconnecting." };
  }

  const conflict = await Integration.findOne({
    provider: "meta_ads",
    "meta.pageId": pageId,
    workspace: { $ne: workspaceId },
  }).select("_id");
  if (conflict) {
    return {
      formError: "This Facebook Page is already connected to another workspace.",
    };
  }

  try {
    await subscribePageToLeadgen(pageId, decryptSecret(page.accessToken));
  } catch (err) {
    console.error("[meta-ads] page subscription failed", err);
    return {
      formError:
        "Couldn't subscribe to the page's lead events. Please try again.",
    };
  }

  integration.meta.pageId = page.id;
  integration.meta.pageName = page.name;
  integration.meta.pageAccessToken = page.accessToken;
  integration.meta.tokenStatus = "valid";
  integration.set("meta.pendingPages", []);
  try {
    await integration.save();
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return {
        formError:
          "This Facebook Page is already connected to another workspace.",
      };
    }
    throw err;
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function setMetaAdsStatus(
  workspaceId: string,
  status: IntegrationStatus,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  if (!(INTEGRATION_STATUSES as readonly string[]).includes(status)) {
    return { formError: "Invalid status." };
  }

  const result = await Integration.updateOne(
    { workspace: workspaceId, provider: "meta_ads" },
    { $set: { status } },
  );
  if (result.matchedCount === 0) {
    return { formError: "Meta Ads integration isn't connected yet." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}

export async function disconnectMetaAds(
  workspaceId: string,
): Promise<IntegrationActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "meta_ads",
  });
  if (!integration) return { ok: true };

  // Best-effort: stop Meta from sending events for this page. Never block
  // disconnect on a Graph API failure.
  if (integration.meta?.pageId && integration.meta.pageAccessToken) {
    try {
      await unsubscribePage(
        integration.meta.pageId,
        decryptSecret(integration.meta.pageAccessToken),
      );
    } catch (err) {
      console.warn("[meta-ads] page unsubscribe failed", err);
    }
  }

  await Integration.deleteOne({ _id: integration._id });

  revalidatePath(`/workspace/${workspaceId}/settings/integrations`);
  return { ok: true };
}
