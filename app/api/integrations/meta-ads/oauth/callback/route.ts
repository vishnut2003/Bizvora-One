import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Integration from "@/models/integration";
import {
  canManageIntegrations,
  decryptSecret,
  encryptSecret,
  safeEqualString,
} from "@/lib/integration";
import { getActorRole } from "@/lib/workspace-access";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchMetaUser,
  listPages,
  META_OAUTH_SCOPES,
  OAUTH_NONCE_COOKIE,
  subscribePageToLeadgen,
  type MetaPage,
} from "@/lib/meta-ads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectTo(origin: string, workspaceId: string, result: string) {
  const url = new URL(
    `/workspace/${workspaceId}/settings/integrations`,
    origin,
  );
  url.searchParams.set("meta-ad", result);
  return Response.redirect(url, 302);
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const stateParam = params.get("state");
  const errorParam = params.get("error");

  if (errorParam) {
    return Response.json({ error: errorParam }, { status: 400 });
  }
  if (!code || !stateParam) {
    return Response.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  let parsedState: { workspaceId?: string; nonce?: string };
  try {
    parsedState = JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf8"),
    );
  } catch {
    return Response.json({ error: "invalid_state" }, { status: 400 });
  }
  const workspaceId = parsedState.workspaceId ?? "";
  const stateNonce = parsedState.nonce ?? "";

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return Response.json({ error: "invalid_workspace" }, { status: 400 });
  }

  const jar = await cookies();
  const cookieNonce = jar.get(OAUTH_NONCE_COOKIE)?.value ?? "";
  if (!safeEqualString(stateNonce, cookieNonce)) {
    return Response.json({ error: "state_nonce_mismatch" }, { status: 400 });
  }
  // Consume the nonce so it can't be replayed.
  jar.delete(OAUTH_NONCE_COOKIE);

  const session = await auth();
  if (!session?.user?.id) {
    const url = new URL("/login", origin);
    return Response.redirect(url, 302);
  }

  await connectDB();
  const workspace = await Workspace.findById(workspaceId).select(
    "owner members",
  );
  if (!workspace) {
    return Response.json({ error: "workspace_not_found" }, { status: 404 });
  }

  const role = getActorRole(workspace, session.user.id);
  if (!canManageIntegrations(role)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // Multi-tenant: the code exchange runs against the workspace's own Meta
  // app, whose credentials were saved via the integrations card.
  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "meta_ads",
  });
  const appId = integration?.meta?.appId;
  const encryptedAppSecret = integration?.meta?.appSecret;
  if (!integration || !appId || !encryptedAppSecret) {
    return redirectTo(origin, workspaceId, "missing_credentials");
  }

  let longLivedToken: string;
  let expiresAt: Date | null;
  let pages: MetaPage[];
  let accountLabel: string | null;
  try {
    const appSecret = decryptSecret(encryptedAppSecret);
    const shortLived = await exchangeCodeForToken(appId, appSecret, code);
    const longLived = await exchangeForLongLivedToken(
      appId,
      appSecret,
      shortLived.access_token,
    );
    longLivedToken = longLived.access_token;
    expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : null;
    const user = await fetchMetaUser(longLivedToken);
    accountLabel = user ? `${user.name || "Facebook user"} (${user.id})` : null;
    pages = await listPages(longLivedToken);
  } catch (err) {
    console.error("[meta-ads-oauth] token/pages fetch failed", err);
    return redirectTo(origin, workspaceId, "error");
  }

  if (pages.length === 0) {
    return redirectTo(origin, workspaceId, "no_pages");
  }

  // Single page — connect it right away. Multiple pages — stash them
  // (tokens encrypted) and let the user pick in the card UI.
  const autoSelect = pages.length === 1 ? pages[0] : null;

  if (autoSelect) {
    // Friendly pre-check; the partial unique index is the real guarantee.
    const conflict = await Integration.findOne({
      provider: "meta_ads",
      "meta.pageId": autoSelect.id,
      workspace: { $ne: workspaceId },
    }).select("_id");
    if (conflict) {
      return redirectTo(origin, workspaceId, "page_in_use");
    }
    try {
      await subscribePageToLeadgen(autoSelect.id, autoSelect.access_token);
    } catch (err) {
      console.error("[meta-ads-oauth] page subscription failed", err);
      return redirectTo(origin, workspaceId, "error");
    }
  }

  integration.oauth = {
    accountEmail: accountLabel,
    refreshToken: encryptSecret(longLivedToken),
    accessToken: null,
    accessTokenExpiresAt: expiresAt,
    scopes: META_OAUTH_SCOPES,
  };
  // Set page fields individually so the saved app credentials survive.
  integration.set("meta.tokenStatus", "valid");
  if (autoSelect) {
    integration.set("meta.pageId", autoSelect.id);
    integration.set("meta.pageName", autoSelect.name);
    integration.set(
      "meta.pageAccessToken",
      encryptSecret(autoSelect.access_token),
    );
    integration.set("meta.pendingPages", []);
  } else {
    integration.set("meta.pageId", null);
    integration.set("meta.pageName", null);
    integration.set("meta.pageAccessToken", null);
    integration.set(
      "meta.pendingPages",
      pages.map((p) => ({
        id: p.id,
        name: p.name,
        accessToken: encryptSecret(p.access_token),
      })),
    );
  }
  if (integration.status !== "active") integration.status = "active";

  try {
    await integration.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // Lost the race on the {provider, meta.pageId} unique index.
      return redirectTo(origin, workspaceId, "page_in_use");
    }
    console.error("[meta-ads-oauth] failed to save integration", err);
    return redirectTo(origin, workspaceId, "error");
  }

  return redirectTo(
    origin,
    workspaceId,
    autoSelect ? "connected" : "select_page",
  );
}
