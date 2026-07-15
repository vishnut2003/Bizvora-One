import Customer from "@/models/customer";
import { canViewAllCustomers } from "@/lib/customer";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  customerToRawInput,
  parseCustomerInput,
  updateCustomerForActor,
} from "@/lib/services/customer-service";
import { requireCustomerViewer, unwrapCustomerResult } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; customerId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, customerId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireCustomerViewer(access);
  requireObjectId(customerId);

  const filter: Record<string, unknown> = {
    _id: customerId,
    workspace: workspaceId,
  };
  if (!canViewAllCustomers(access.role)) filter.assignedTo = access.userId;

  const customer = await Customer.findOne(filter)
    .populate("assignedTo", "name image")
    .populate("createdBy", "name image")
    .populate("notes.author", "name image")
    .populate("activity.actor", "name image")
    .lean();
  if (!customer) throw new MobileApiError(404, "customer_not_found");

  return ok({ customer: serialize(customer) });
});

// Partial update: provided fields are merged over the customer's current
// values, then run through the same full-update path as the web edit form.
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, customerId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireCustomerViewer(access);
  requireObjectId(customerId);

  const body = await readJsonBody(req);

  const filter: Record<string, unknown> = {
    _id: customerId,
    workspace: workspaceId,
  };
  if (!canViewAllCustomers(access.role)) filter.assignedTo = access.userId;
  const existing = await Customer.findOne(filter).lean();
  if (!existing) throw new MobileApiError(404, "customer_not_found");

  const merged = { ...customerToRawInput(existing), ...body };
  const parsed = parseCustomerInput(merged);
  if (parsed.errors) {
    throw new MobileApiError(
      422,
      "validation_failed",
      parsed.errors as Record<string, string>,
    );
  }

  const result = await updateCustomerForActor(
    { actorId: access.userId, role: access.role, workspace: access.workspace },
    customerId,
    parsed.data!,
  );
  const customer = unwrapCustomerResult(result);

  return ok({ customer: serialize(customer.toObject()) });
});
