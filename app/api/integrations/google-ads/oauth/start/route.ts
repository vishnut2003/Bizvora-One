import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import { canManageIntegrations, generateNonce } from "@/lib/integration";
import { getActorRole } from "@/lib/workspace-access";
import {
  buildGoogleAdsAuthUrl,
  OAUTH_NONCE_COOKIE,
  OAUTH_NONCE_TTL_S,
} from "@/lib/google-ads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "";

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return Response.json({ error: "invalid_workspace" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    const url = new URL("/login", request.nextUrl.origin);
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

  const nonce = generateNonce();
  const state = Buffer.from(
    JSON.stringify({ workspaceId, nonce }),
    "utf8",
  ).toString("base64url");

  const jar = await cookies();
  jar.set({
    name: OAUTH_NONCE_COOKIE,
    value: nonce,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_NONCE_TTL_S,
  });

  const authUrl = buildGoogleAdsAuthUrl(state);
  return Response.redirect(authUrl, 302);
}
