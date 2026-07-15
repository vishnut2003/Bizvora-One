import Lead from "@/models/lead";
import { canViewAllLeads } from "@/lib/lead";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  leadToRawInput,
  parseLeadInput,
  updateLeadForActor,
} from "@/lib/services/lead-service";
import { requireLeadViewer, unwrapLeadResult } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; leadId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, leadId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireLeadViewer(access);
  requireObjectId(leadId);

  const filter: Record<string, unknown> = {
    _id: leadId,
    workspace: workspaceId,
  };
  if (!canViewAllLeads(access.role)) filter.assignedTo = access.userId;

  const lead = await Lead.findOne(filter)
    .populate("assignedTo", "name image")
    .populate("createdBy", "name image")
    .populate("notes.author", "name image")
    .populate("activity.actor", "name image")
    .lean();
  if (!lead) throw new MobileApiError(404, "lead_not_found");

  return ok({ lead: serialize(lead) });
});

// Partial update: provided fields are merged over the lead's current values,
// then run through the same full-update path as the web edit form (identical
// validation, activity events, and notifications).
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, leadId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireLeadViewer(access);
  requireObjectId(leadId);

  const body = await readJsonBody(req);

  const filter: Record<string, unknown> = {
    _id: leadId,
    workspace: workspaceId,
  };
  if (!canViewAllLeads(access.role)) filter.assignedTo = access.userId;
  const existing = await Lead.findOne(filter).lean();
  if (!existing) throw new MobileApiError(404, "lead_not_found");

  const merged = { ...leadToRawInput(existing), ...body };
  const parsed = parseLeadInput(merged);
  if (parsed.errors) {
    throw new MobileApiError(
      422,
      "validation_failed",
      parsed.errors as Record<string, string>,
    );
  }

  const result = await updateLeadForActor(
    { actorId: access.userId, role: access.role, workspace: access.workspace },
    leadId,
    parsed.data!,
  );
  const lead = unwrapLeadResult(result);

  return ok({ lead: serialize(lead.toObject()) });
});
