import crypto from "crypto";
import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/config/db";
import Integration from "@/models/integration";
import Lead from "@/models/lead";
import { maybeTriggerLeadCall } from "@/lib/lead-call";
import { safeEqualString } from "@/lib/integration";
import {
  composeWebFormNote,
  getClientIp,
  looksLikeBot,
  mapWebFormSubmission,
  parseWebFormBody,
  readWebFormKey,
  tagify,
} from "@/lib/web-form";
import { rateLimitWebForm } from "@/lib/web-form-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  // Rate-limit by IP before doing any work. Hard limit means we *can* return
  // 429 here (unlike auth failures) since the limit isn't a secret — it's
  // documented and applies equally to every caller.
  const ip = getClientIp(request.headers);
  const rl = rateLimitWebForm(ip);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await parseWebFormBody(request);

  // Honeypot — drop silently. Don't tell the bot it was caught.
  if (looksLikeBot(body)) return ok();

  await connectDB();

  const integration = await Integration.findOne({
    workspace: workspaceId,
    provider: "web_form",
  });
  if (!integration || integration.status === "paused") {
    return ok();
  }

  const submittedKey = readWebFormKey(request.headers, body);
  if (!safeEqualString(submittedKey, integration.webhookKey)) {
    console.warn("[web-form-webhook] key mismatch", { workspaceId });
    return ok();
  }

  const mapped = mapWebFormSubmission(body);

  // Require *something* identifying — either a name, email, or phone.
  if (!mapped.email && !mapped.phone && !mapped.name) {
    console.warn("[web-form-webhook] empty submission", { workspaceId });
    return ok();
  }

  const now = new Date();

  // Synthetic dedupe ID: same IP + email + name within the same second is
  // almost certainly a double-fire from the plugin. Outside that window each
  // submission is treated as new.
  const dedupeBasis = [
    Math.floor(now.getTime() / 1000),
    ip,
    mapped.email ?? "",
    mapped.name,
  ].join("|");
  const externalId = crypto
    .createHash("sha1")
    .update(dedupeBasis)
    .digest("hex");

  const baseTags = ["web-form"];
  const formTag = mapped.formName ? tagify(mapped.formName) : "";
  if (formTag) baseTags.push(formTag);
  const defaultTags = integration.defaults?.tags ?? [];
  const tags = Array.from(new Set([...defaultTags, ...baseTags])).slice(0, 20);

  const priority = integration.defaults?.priority ?? "medium";
  const createdBy = integration.connectedBy;

  const noteBody = composeWebFormNote(mapped);
  const notes = noteBody
    ? [{ body: noteBody, author: createdBy, createdAt: now }]
    : [];

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
      source: "website",
      priority,
      estimatedValue: 0,
      assignedTo: null,
      createdBy,
      tags,
      notes,
      activity: [
        {
          type: "created",
          actor: createdBy,
          at: now,
          data: {
            stage: "new",
            via: "web_form",
            formName: mapped.formName ?? null,
          },
        },
        ...(noteBody
          ? [
              {
                type: "note_added" as const,
                actor: createdBy,
                at: now,
                data: { body: noteBody },
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
        provider: "web_form",
        externalId,
        formId: mapped.formName,
        campaignId: null,
        gclid: null,
        isTest: false,
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      // Same submission, retried within the dedupe window — treat as success.
      return ok({ duplicate: true });
    }
    console.error("[web-form-webhook] failed to create lead", err);
    return ok({ error: "create_failed" });
  }

  await Integration.updateOne(
    { _id: integration._id },
    {
      $inc: { totalLeadsReceived: 1 },
      $set: { lastEventAt: now },
    },
  );

  // Fire the AI voice-agent call if enabled for this workspace (non-fatal).
  await maybeTriggerLeadCall(lead, { isTest: false });

  revalidatePath(`/workspace/${workspaceId}/leads`);
  return ok();
}
