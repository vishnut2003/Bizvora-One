import type { FilterQuery } from "mongoose";
import Customer, { type ICustomer } from "@/models/customer";
import {
  CUSTOMER_STATUSES,
  canViewAllCustomers,
  type CustomerStatus,
} from "@/lib/customer";
import { LEAD_SOURCES, type LeadSource } from "@/lib/lead";
import { escapeRegex } from "@/lib/voucher";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  listEnvelope,
  ok,
  parsePagination,
  parseSort,
  readJsonBody,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  createCustomerForActor,
  parseCustomerInput,
} from "@/lib/services/customer-service";
import { requireCustomerViewer, unwrapCustomerResult } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORT_FIELDS = ["createdAt", "updatedAt", "name"] as const;

export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const access = await requireMobileWorkspace(req, workspaceId);
    requireCustomerViewer(access);

    const url = new URL(req.url);
    const pagination = parsePagination(url);
    const sort = parseSort(url, SORT_FIELDS, { updatedAt: -1 });

    // Visibility scope: sales executives only see their own customers.
    const filter: FilterQuery<ICustomer> = canViewAllCustomers(access.role)
      ? { workspace: workspaceId }
      : { workspace: workspaceId, assignedTo: access.userId };

    const status = url.searchParams.get("status") ?? "";
    if ((CUSTOMER_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as CustomerStatus;
    }

    const source = url.searchParams.get("source") ?? "";
    if ((LEAD_SOURCES as readonly string[]).includes(source)) {
      filter.source = source as LeadSource;
    }

    if (canViewAllCustomers(access.role)) {
      const assignee = url.searchParams.get("assignedTo") ?? "";
      if (assignee === "me") filter.assignedTo = access.userId;
      else if (assignee === "unassigned") filter.assignedTo = null;
      else if (assignee.length > 0) filter.assignedTo = assignee;
    }

    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length > 0) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: re }, { email: re }, { company: re }, { phone: re }];
    }

    const [docs, total] = await Promise.all([
      Customer.find(filter)
        .select("-activity -notes")
        .populate("assignedTo", "name image")
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    return ok(listEnvelope(docs, pagination, total));
  },
);

export const POST = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const access = await requireMobileWorkspace(req, workspaceId);
    requireCustomerViewer(access);

    const body = await readJsonBody(req);
    const parsed = parseCustomerInput(body);
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
    );
    const customer = unwrapCustomerResult(result);

    return ok({ customer: serialize(customer.toObject()) }, 201);
  },
);
