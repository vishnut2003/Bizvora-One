import type { FilterQuery } from "mongoose";
import Vendor, { type IVendor } from "@/models/vendor";
import { VENDOR_STATUSES, type VendorStatus } from "@/lib/vendor";
import { escapeRegex } from "@/lib/voucher";
import { requireMobileWorkspace } from "@/lib/mobile-auth";
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
  parseVendorBody,
  requireVendorManager,
  requireVendorViewer,
} from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVendorViewer(access);

  const url = new URL(req.url);
  const pagination = parsePagination(url);
  const sort = parseSort(url, ["createdAt", "updatedAt", "name"], {
    updatedAt: -1,
  });

  const filter: FilterQuery<IVendor> = { workspace: workspaceId };

  const status = url.searchParams.get("status") ?? "";
  if ((VENDOR_STATUSES as readonly string[]).includes(status)) {
    filter.status = status as VendorStatus;
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length > 0) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { name: re },
      { displayName: re },
      { email: re },
      { contactPerson: re },
    ];
  }

  const [docs, total] = await Promise.all([
    Vendor.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Vendor.countDocuments(filter),
  ]);

  return ok(listEnvelope(docs, pagination, total));
});

export const POST = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVendorManager(access);

  const body = await readJsonBody(req);
  const d = parseVendorBody(body);

  const vendor = await Vendor.create({
    workspace: workspaceId,
    name: d.name,
    displayName: d.displayName,
    email: d.email || null,
    phone: d.phone || null,
    contactPerson: d.contactPerson,
    address: {
      line1: d.line1,
      line2: d.line2,
      city: d.city,
      state: d.state,
      country: d.country,
      postalCode: d.postalCode,
    },
    gstin: d.gstin,
    pan: d.pan,
    status: d.status,
    notes: d.notes,
    createdBy: access.userId,
  });

  return ok({ vendor: serialize(vendor.toObject()) }, 201);
});
