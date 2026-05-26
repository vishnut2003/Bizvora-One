import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Integration from "@/models/integration";
import {
  canManageIntegrations,
  generateWebhookKey,
  safeEqualString,
} from "@/lib/integration";
import { getActorRole } from "@/lib/workspace-access";
import {
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
  OAUTH_NONCE_COOKIE,
  wrapRefreshTokenForStorage,
} from "@/lib/google-ads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectTo(origin: string, workspaceId: string, status: string) {
  const url = new URL(
    `/workspace/${workspaceId}/settings/integrations`,
    origin,
  );
  url.searchParams.set("status", status);
  return Response.redirect(url, 302);
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

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error("[google-ads-oauth] token exchange failed", err);
    return redirectTo(origin, workspaceId, "oauth_error");
  }

  const accountEmail = await fetchGoogleUserEmail(tokens.access_token);
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 0) * 1000);
  const scopes = tokens.scope ? tokens.scope.split(" ") : [];

  const existing = await Integration.findOne({
    workspace: workspaceId,
    provider: "google_ads",
  });

  if (existing) {
    existing.oauth = {
      accountEmail,
      refreshToken:
        tokens.refresh_token != null
          ? wrapRefreshTokenForStorage(tokens.refresh_token)
          : existing.oauth?.refreshToken ?? null,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      scopes,
    };
    if (existing.status !== "active") existing.status = "active";
    await existing.save();
  } else {
    await Integration.create({
      workspace: workspaceId,
      provider: "google_ads",
      webhookKey: generateWebhookKey(),
      oauth: {
        accountEmail,
        refreshToken: tokens.refresh_token
          ? wrapRefreshTokenForStorage(tokens.refresh_token)
          : null,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: expiresAt,
        scopes,
      },
      defaults: { priority: "medium", tags: ["google-ads"] },
      status: "active",
      connectedBy: session.user.id,
    });
  }

  return redirectTo(origin, workspaceId, "connected");
}
