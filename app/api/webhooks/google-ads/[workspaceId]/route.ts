import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import Integration from "@/models/integration";
import Lead from "@/models/lead";
import { maybeTriggerLeadCall } from "@/lib/lead-call";
import { safeEqualString } from "@/lib/integration";
import {
  mapPayloadToLead,
  type GoogleAdsLeadPayload,
} from "@/lib/google-ads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// We almost always reply 200, even on auth failure. Google retries 4xx/5xx
// aggressively, and we don't want to leak whether a workspace exists or
// whether a key was valid.
function ok(extra: Record<string, unknown> = {}) {
  return Response.json({ ok: true, ...extra });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await ctx.params;

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return ok();
  }

  let payload: GoogleAdsLeadPayload;
  try {
    payload = (await request.json()) as GoogleAdsLeadPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  await connectDB();

  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "google_ads",
  });
  if (!integration || integration.status === "paused") {
    // Do not leak existence/state.
    return ok();
  }

  const submittedKey =
    typeof payload.google_key === "string" ? payload.google_key : "";
  if (!safeEqualString(submittedKey, integration.webhookKey)) {
    console.warn("[google-ads-webhook] key mismatch", { workspaceId });
    return ok();
  }

  const defaults = {
    priority: integration.defaults?.priority ?? "medium",
    tags: integration.defaults?.tags ?? [],
  };
  const mapped = mapPayloadToLead(payload, defaults);
  if (!mapped) {
    console.warn("[google-ads-webhook] payload missing lead_id", { workspaceId });
    return ok();
  }

  const now = new Date();
  const createdBy = integration.connectedBy;

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
      source: "google_ads",
      priority: mapped.priority,
      estimatedValue: 0,
      assignedTo: null,
      createdBy,
      tags: mapped.tags,
      notes: [],
      activity: [
        {
          type: "created",
          actor: createdBy,
          at: now,
          data: { stage: "new", via: "google_ads", isTest: mapped.isTest },
        },
      ],
      nextFollowUpAt: null,
      lastContactedAt: null,
      wonAt: null,
      lostAt: null,
      lostReason: "",
      externalSource: {
        provider: "google_ads",
        externalId: mapped.externalId,
        formId: mapped.formId,
        campaignId: mapped.campaignId,
        gclid: mapped.gclid,
        isTest: mapped.isTest,
      },
    });
  } catch (err) {
    // Duplicate key — Google retried, we already have this lead. Treat as
    // success so they stop retrying.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return ok({ duplicate: true });
    }
    console.error("[google-ads-webhook] failed to create lead", err);
    return ok({ error: "create_failed" });
  }

  await Integration.updateOne(
    { _id: integration._id },
    {
      $inc: { totalLeadsReceived: 1 },
      $set: { lastEventAt: now },
    },
  );

  // Fire the AI voice-agent call if enabled (skips Google Ads test leads).
  await maybeTriggerLeadCall(lead, { isTest: mapped.isTest });

  revalidatePath(`/workspace/${workspaceId}/leads`);
  return ok();
}
