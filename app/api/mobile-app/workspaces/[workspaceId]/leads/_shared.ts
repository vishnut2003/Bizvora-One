import "server-only";
import Lead from "@/models/lead";
import { canViewAllLeads, canViewLeads } from "@/lib/lead";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";
import type { LeadServiceResult } from "@/lib/services/lead-service";

// Maps a lead-service failure to the mobile JSON error convention.
export function unwrapLeadResult(
  result: LeadServiceResult,
): Extract<LeadServiceResult, { ok: true }>["lead"] {
  if (result.ok) return result.lead;
  switch (result.code) {
    case "forbidden":
      throw new MobileApiError(403, "forbidden");
    case "lead_not_found":
      throw new MobileApiError(404, "lead_not_found");
    case "cannot_manage":
      throw new MobileApiError(403, "forbidden");
    case "validation":
      throw new MobileApiError(
        422,
        "validation_failed",
        result.fieldErrors as Record<string, string>,
      );
    case "save_failed":
      throw new MobileApiError(500, "save_failed");
  }
}

export function requireLeadViewer(ctx: MobileWorkspaceContext): void {
  if (!canViewLeads(ctx.role)) throw new MobileApiError(403, "forbidden");
}

/**
 * Loads a lead within the caller's visibility scope: sales executives can
 * only reach leads assigned to themselves (mirrors the web list scoping),
 * so out-of-scope leads read as 404 rather than leaking existence.
 */
export async function findVisibleLead(
  ctx: MobileWorkspaceContext,
  leadId: string,
) {
  const filter: Record<string, unknown> = {
    _id: leadId,
    workspace: String(ctx.workspace._id),
  };
  if (!canViewAllLeads(ctx.role)) filter.assignedTo = ctx.userId;

  const lead = await Lead.findOne(filter);
  if (!lead) throw new MobileApiError(404, "lead_not_found");
  return lead;
}
