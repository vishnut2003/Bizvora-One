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
import {
  findVisibleLead,
  requireLeadViewer,
  unwrapLeadResult,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; leadId: string }> };

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, leadId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireLeadViewer(access);
  requireObjectId(leadId);

  const body = await readJsonBody(req);
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!noteBody) {
    throw new MobileApiError(422, "validation_failed", {
      body: "Please enter a note.",
    });
  }

  const existing = await findVisibleLead(access, leadId);

  const merged = { ...leadToRawInput(existing.toObject()), noteBody };
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
