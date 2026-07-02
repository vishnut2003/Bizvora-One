import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import Integration from "@/models/integration";
import Lead from "@/models/lead";
import { maybeTriggerLeadCall } from "@/lib/lead-call";
import { decryptSecret, safeEqualString } from "@/lib/integration";
import {
  fetchLeadgen,
  mapFieldDataToLead,
  verifyMetaWebhookSignature,
  type MetaWebhookPayload,
} from "@/lib/meta-ads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Multi-tenant: each workspace's own Meta app posts to this per-workspace
// URL. The GET handler answers Meta's verification handshake (the verify
// token is the integration's webhookKey, shown in the card), and POSTs are
// authenticated with the X-Hub-Signature-256 HMAC of the tenant's app secret.

// Echoes hub.challenge when the tenant saves the callback URL in their Meta
// App Dashboard. Must respond with the raw challenge string, not JSON. A 403
// here surfaces as a config error in the dashboard — intentionally, so the
// tenant knows the verify token is wrong.
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await ctx.params;
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode") ?? "";
  const verifyToken = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";

  if (mode !== "subscribe" || !mongoose.Types.ObjectId.isValid(workspaceId)) {
    return new Response("forbidden", { status: 403 });
  }

  await connectDB();
  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "meta_ads",
  }).select("webhookKey");

  if (integration && safeEqualString(verifyToken, integration.webhookKey)) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  try {
    return await handlePost(request, ctx);
  } catch (err) {
    console.error("[meta-ads-webhook] unexpected failure", err);
    // 500 so Meta redelivers; lead creation is idempotent via the dedupe index.
    return Response.json({ ok: false }, { status: 500 });
  }
}

function ok(extra: Record<string, unknown> = {}) {
  return Response.json({ ok: true, ...extra });
}

async function handlePost(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return ok();
  }

  // The signature is computed over the raw body — read it before parsing.
  const raw = await request.text();

  await connectDB();
  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "meta_ads",
  });
  // Like the other webhooks, don't leak whether a workspace exists or is
  // paused — Meta stops retrying on 200.
  if (!integration || !integration.meta?.appSecret) {
    return ok();
  }

  let appSecret: string;
  try {
    appSecret = decryptSecret(integration.meta.appSecret);
  } catch (err) {
    console.error("[meta-ads-webhook] app secret decrypt failed", { workspaceId }, err);
    return ok();
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaWebhookSignature(appSecret, raw, signature)) {
    console.warn("[meta-ads-webhook] signature mismatch", { workspaceId });
    return ok();
  }

  if (integration.status === "paused" || !integration.meta.pageAccessToken) {
    return ok();
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(raw) as MetaWebhookPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (payload.object !== "page") {
    return ok({ ignored: true });
  }

  const connectedPageId = integration.meta.pageId ?? "";
  const leadgenIds: string[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const value = change.value ?? {};
      const leadgenId = value.leadgen_id != null ? String(value.leadgen_id) : "";
      const pageId =
        value.page_id != null
          ? String(value.page_id)
          : entry.id != null
            ? String(entry.id)
            : "";
      // Only ingest events for the page this workspace connected.
      if (leadgenId && pageId === connectedPageId) leadgenIds.push(leadgenId);
    }
  }
  if (leadgenIds.length === 0) {
    return ok();
  }

  let pageToken: string;
  try {
    pageToken = decryptSecret(integration.meta.pageAccessToken);
  } catch (err) {
    console.error("[meta-ads-webhook] page token decrypt failed", { workspaceId }, err);
    return ok();
  }

  const defaults = {
    priority: integration.defaults?.priority ?? "medium",
    tags: integration.defaults?.tags ?? [],
  };
  const createdBy = integration.connectedBy;

  let transientFailure = false;
  let createdAny = false;

  for (const leadgenId of leadgenIds) {
    const result = await fetchLeadgen(leadgenId, pageToken);
    if (!result.ok) {
      if (result.kind === "auth") {
        // The page token is dead — flag it so the card shows "Reconnect".
        console.warn("[meta-ads-webhook] page token invalid", {
          workspaceId,
          message: result.message,
        });
        await Integration.updateOne(
          { _id: integration._id },
          { $set: { "meta.tokenStatus": "invalid" } },
        );
      } else if (result.kind === "transient") {
        console.warn("[meta-ads-webhook] transient fetch failure", {
          workspaceId,
          leadgenId,
          message: result.message,
        });
        transientFailure = true;
      }
      // not_found (e.g. dashboard "Test" button's fake leadgen_id) — drop.
      continue;
    }

    const mapped = mapFieldDataToLead(result.details, defaults);
    const now = new Date();

    let lead;
    try {
      lead = await Lead.create({
        workspace: workspaceId,
        name: mapped.name,
        email: mapped.email,
        phone: mapped.phone,
        company: mapped.company,
        jobTitle: mapped.jobTitle,
        website: mapped.website,
        address: {
          city: mapped.city,
          state: mapped.state,
          country: mapped.country,
        },
        stage: "new",
        source: "meta_ads",
        priority: mapped.priority,
        estimatedValue: 0,
        assignedTo: null,
        createdBy,
        tags: mapped.tags,
        notes: mapped.noteBody
          ? [{ body: mapped.noteBody, author: createdBy, createdAt: now }]
          : [],
        activity: [
          {
            type: "created",
            actor: createdBy,
            at: now,
            data: { stage: "new", via: "meta_ads", isTest: mapped.isTest },
          },
          ...(mapped.noteBody
            ? [
                {
                  type: "note_added" as const,
                  actor: createdBy,
                  at: now,
                  data: { body: mapped.noteBody },
                },
              ]
            : []),
        ],
        nextFollowUpAt: null,
        lastContactedAt: null,
        wonAt: null,
        lostAt: null,
        lostReason: "",
        externalSource: {
          provider: "meta_ads",
          externalId: mapped.externalId,
          formId: mapped.formId,
          campaignId: mapped.campaignId,
          adId: mapped.adId,
          gclid: null,
          isTest: mapped.isTest,
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: number }).code === 11000
      ) {
        // Redelivered event — we already have this lead.
        continue;
      }
      console.error("[meta-ads-webhook] failed to create lead", err);
      continue;
    }

    await Integration.updateOne(
      { _id: integration._id },
      {
        $inc: { totalLeadsReceived: 1 },
        $set: { lastEventAt: now },
      },
    );

    // Fire the AI voice-agent call if enabled (skips test leads).
    await maybeTriggerLeadCall(lead, { isTest: mapped.isTest });
    createdAny = true;
  }

  if (createdAny) {
    revalidatePath(`/workspace/${workspaceId}/leads`);
  }

  if (transientFailure) {
    // Ask Meta to redeliver the batch; already-created leads dedupe away.
    return Response.json({ ok: false, retry: true }, { status: 500 });
  }
  return ok();
}
