import "server-only";

import AgentProfile from "@/models/agent-profile";
import Company from "@/models/company";
import { toE164 } from "@/lib/phone";
import { decryptSecret } from "@/lib/integration";
import { triggerOutboundCall } from "@/lib/vapi";

// Minimal shape we need from a freshly-created lead. Works with the Mongoose doc
// returned by Lead.create (fields are read directly).
type LeadLike = {
  workspace: unknown;
  name?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  stage?: string | null;
};

// Single chokepoint called after a Lead is created from ANY path (manual UI or
// webhook). Fire-and-forget semantics: every failure is logged and swallowed so
// lead creation is never broken by the calling feature. Awaited (one quick POST)
// rather than detached, since serverless may kill post-response work.
export async function maybeTriggerLeadCall(
  lead: LeadLike,
  opts: { isTest?: boolean } = {},
): Promise<void> {
  try {
    if (opts.isTest) return;

    const workspaceId = String(lead.workspace);

    const profile = await AgentProfile.findOne({ workspace: workspaceId }).lean();
    if (!profile || !profile.enabled) return;

    // Tenant must have connected their own Vapi account (key + number).
    if (!profile.vapiApiKey || !profile.vapiPhoneNumberId) {
      console.warn("[lead-call] skipped — Vapi not connected", { workspaceId });
      return;
    }
    const apiKey = decryptSecret(profile.vapiApiKey);
    if (!apiKey) return;

    const company = await Company.findOne({ workspace: workspaceId }).lean();

    // Use the company's country as the default dial code for bare national
    // numbers (e.g. some webhook submissions); manual leads are already "+...".
    const country = company?.address?.country;
    const defaultIso =
      typeof country === "string" && country.length === 2
        ? country.toUpperCase()
        : undefined;

    const number = toE164(lead.phone ?? "", defaultIso);
    if (!number) {
      console.warn("[lead-call] skipped — no valid phone", { workspaceId });
      return;
    }

    await triggerOutboundCall({
      apiKey,
      phoneNumberId: profile.vapiPhoneNumberId,
      number,
      profile: {
        personaName: profile.personaName,
        tone: profile.tone,
        language: profile.language,
        offering: profile.offering,
        valueProp: profile.valueProp,
        faqs: profile.faqs,
        bookingRule: profile.bookingRule,
        aiDisclosure: profile.aiDisclosure,
        voice: profile.voice,
      },
      company: {
        displayName: company?.displayName,
        legalName: company?.legalName,
        phone: company?.phone,
        email: company?.email,
        website: company?.website,
      },
      lead: {
        name: lead.name ?? undefined,
        source: lead.source ?? undefined,
        stage: lead.stage ?? undefined,
        company: lead.company ?? undefined,
      },
    });

    await AgentProfile.updateOne(
      { workspace: workspaceId },
      { $inc: { totalCallsTriggered: 1 }, $set: { lastCallAt: new Date() } },
    );
  } catch (err) {
    // Never let the calling feature break lead creation.
    console.error("[lead-call] failed to trigger outbound call", err);
  }
}
