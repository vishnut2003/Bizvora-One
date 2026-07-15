import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  createCustomerForActor,
  parseCustomerInput,
} from "@/lib/services/customer-service";
import { unwrapCustomerResult } from "../../../customers/_shared";
import { findVisibleLead, requireLeadViewer } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; leadId: string }> };

// Converts a lead into a customer. Customer fields not provided in the body
// are prefilled from the lead (same as the web conversion dialog).
export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, leadId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireLeadViewer(access);
  requireObjectId(leadId);

  const body = await readJsonBody(req);
  const lead = await findVisibleLead(access, leadId);

  const defaults: Record<string, unknown> = {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    website: lead.website ?? "",
    city: lead.address?.city ?? "",
    state: lead.address?.state ?? "",
    country: lead.address?.country ?? "",
    status: "active",
    source: lead.source,
    assignedTo: lead.assignedTo ? String(lead.assignedTo) : "",
    tags: lead.tags ?? [],
    noteBody: "",
  };

  const parsed = parseCustomerInput({ ...defaults, ...body });
  if (parsed.errors) {
    throw new MobileApiError(
      422,
      "validation_failed",
      parsed.errors as Record<string, string>,
    );
  }

  const result = await createCustomerForActor(
    { actorId: access.userId, role: access.role, workspace: access.workspace },
    parsed.data!,
    { fromLeadId: leadId },
  );
  const customer = unwrapCustomerResult(result);

  return ok({ customer: serialize(customer.toObject()) }, 201);
});
