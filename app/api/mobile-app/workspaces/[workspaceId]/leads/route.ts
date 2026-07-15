import type { FilterQuery } from "mongoose";
import Lead, { type ILead } from "@/models/lead";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  OPEN_LEAD_STAGES,
  canViewAllLeads,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/lib/lead";
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
  createLeadForActor,
  parseLeadInput,
} from "@/lib/services/lead-service";
import { requireLeadViewer, unwrapLeadResult } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "nextFollowUpAt",
  "estimatedValue",
  "name",
] as const;

export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const access = await requireMobileWorkspace(req, workspaceId);
    requireLeadViewer(access);

    const url = new URL(req.url);
    const pagination = parsePagination(url);
    const sort = parseSort(url, SORT_FIELDS, { updatedAt: -1 });

    // Visibility scope: sales executives only see leads assigned to them.
    const filter: FilterQuery<ILead> = canViewAllLeads(access.role)
      ? { workspace: workspaceId }
      : { workspace: workspaceId, assignedTo: access.userId };

    const stage = url.searchParams.get("stage") ?? "";
    if (stage === "open") {
      filter.stage = { $in: OPEN_LEAD_STAGES };
    } else if ((LEAD_STAGES as readonly string[]).includes(stage)) {
      filter.stage = stage as LeadStage;
    }

    const priority = url.searchParams.get("priority") ?? "";
    if ((LEAD_PRIORITIES as readonly string[]).includes(priority)) {
      filter.priority = priority as LeadPriority;
    }

    const source = url.searchParams.get("source") ?? "";
    if ((LEAD_SOURCES as readonly string[]).includes(source)) {
      filter.source = source as LeadSource;
    }

    // Assignee filter is ignored for sales executives — their visibility is
    // already locked to leads assigned to themselves.
    if (canViewAllLeads(access.role)) {
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
      Lead.find(filter)
        .select("-activity -notes")
        .populate("assignedTo", "name image")
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return ok(listEnvelope(docs, pagination, total));
  },
);

export const POST = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const access = await requireMobileWorkspace(req, workspaceId);
    requireLeadViewer(access);

    const body = await readJsonBody(req);
    const parsed = parseLeadInput(body);
    if (parsed.errors) {
      throw new MobileApiError(
        422,
        "validation_failed",
        parsed.errors as Record<string, string>,
      );
    }

    const result = await createLeadForActor(
      { actorId: access.userId, role: access.role, workspace: access.workspace },
      parsed.data!,
    );
    const lead = unwrapLeadResult(result);

    return ok({ lead: serialize(lead.toObject()) }, 201);
  },
);
