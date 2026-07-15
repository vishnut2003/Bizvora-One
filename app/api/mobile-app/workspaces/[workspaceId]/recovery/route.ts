import type { FilterQuery } from "mongoose";
import SalesInvoice, { type ISalesInvoice } from "@/models/sales-invoice";
import User from "@/models/user";
import { escapeRegex } from "@/lib/voucher";
import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, serialize, withMobile } from "@/lib/mobile-api";
import {
  requireVoucherViewer,
  voucherVisibilityFilter,
} from "../../../_lib/finance";
import { SALES_INVOICE_CONFIG } from "../../../_lib/finance-configs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

// Overdue-invoice collections list (mirrors the Recovery page): open
// invoices with balances and their follow-up history. ?bucket=overdue |
// due-soon narrows by due date; ?q= filters by customer/invoice number.
export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireVoucherViewer(SALES_INVOICE_CONFIG, access);

  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") ?? "all";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const filter: FilterQuery<ISalesInvoice> = {
    ...voucherVisibilityFilter(SALES_INVOICE_CONFIG, access),
    status: { $in: ["unpaid", "partial", "overdue"] },
  };
  if (bucket === "overdue") {
    filter.dueDate = { $lt: today };
  } else if (bucket === "due-soon") {
    filter.dueDate = { $gte: today, $lte: inSevenDays };
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length > 0) {
    const re = new RegExp(escapeRegex(q), "i");
    const search = [{ number: re }, { "customer.name": re }];
    if (filter.$or) {
      filter.$and = [...(filter.$and ?? []), { $or: filter.$or }, { $or: search }];
      delete filter.$or;
    } else {
      filter.$or = search;
    }
  }

  const invoices = await SalesInvoice.find(filter)
    .sort({ dueDate: 1, invoiceDate: 1 })
    .limit(500)
    .lean();

  // Resolve follow-up author names in one round-trip.
  const followUpUserIds = Array.from(
    new Set(
      invoices.flatMap((inv) => (inv.followUps ?? []).map((f) => String(f.by))),
    ),
  );
  const users = followUpUserIds.length
    ? await User.find({ _id: { $in: followUpUserIds } })
        .select("name")
        .lean()
    : [];
  const nameById = new Map(users.map((u) => [String(u._id), u.name]));

  const items = invoices.map((inv) => ({
    ...(serialize(inv) as Record<string, unknown>),
    balance: Math.max(0, inv.total - (inv.amountPaid ?? 0)),
    followUps: (inv.followUps ?? []).map((f) => ({
      at: new Date(f.at).toISOString(),
      by: String(f.by),
      byName: nameById.get(String(f.by)) ?? "",
      note: f.note ?? "",
    })),
  }));

  const overdueTotal = invoices
    .filter((i) => i.currency === "INR" && i.dueDate && new Date(i.dueDate) < today)
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid ?? 0)), 0);
  const dueSoonTotal = invoices
    .filter((i) => {
      if (i.currency !== "INR" || !i.dueDate) return false;
      const due = new Date(i.dueDate);
      return due >= today && due <= inSevenDays;
    })
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid ?? 0)), 0);

  return ok({
    items,
    summary: { currency: "INR", overdueTotal, dueSoonTotal },
  });
});
