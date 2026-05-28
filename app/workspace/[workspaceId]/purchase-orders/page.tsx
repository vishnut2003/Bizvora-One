import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { format } from "date-fns";
import PurchaseOrder, { type IPurchaseOrder } from "@/models/purchase-order";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_STATUS_BADGE_CLASS,
  PURCHASE_ORDER_STATUS_LABEL,
  PURCHASE_VIEWER_ROLES,
  canManagePurchases,
  type PurchaseOrderStatus,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";
import VoucherCard from "@/components/voucher-card";
import DeleteVoucherButton from "@/components/delete-voucher-button";
import { deletePurchaseOrder } from "./actions";

export const metadata: Metadata = { title: "Purchase Orders — BizvoraOne" };

type LeanPO = IPurchaseOrder & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function isStatus(v: string): v is PurchaseOrderStatus {
  return (PURCHASE_ORDER_STATUSES as readonly string[]).includes(v);
}
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function PurchaseOrdersPage({
  params,
  searchParams,
}: Props) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PURCHASE_VIEWER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const q = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";

  const baseFilter: FilterQuery<IPurchaseOrder> = { workspace: workspaceId };
  const filter: FilterQuery<IPurchaseOrder> = { ...baseFilter };
  if (isStatus(statusRaw)) filter.status = statusRaw;
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { number: re },
      { "vendor.name": re },
      { "vendor.company": re },
      { notes: re },
    ];
  }

  const ordersRaw = (await PurchaseOrder.find(filter)
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean()) as unknown as LeanPO[];

  const counts: Record<PurchaseOrderStatus, number> = {
    draft: 0,
    confirmed: 0,
    "partially-invoiced": 0,
    invoiced: 0,
    cancelled: 0,
  };
  for (const s of PURCHASE_ORDER_STATUSES) {
    counts[s] = await PurchaseOrder.countDocuments({
      ...baseFilter,
      status: s,
    });
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const canManage = canManagePurchases(role);
  const filtersApplied = Boolean(q) || statusRaw !== "all";

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <ClipboardCheck className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Purchases
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Purchase Orders
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Orders placed on vendors in{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            {canManage ? (
              <Link href={`/workspace/${workspace.id}/purchase-orders/new`}>
                <Button type="button" variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New purchase order
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatPill label="Total" value={total} />
          {PURCHASE_ORDER_STATUSES.map((s) => (
            <StatPill
              key={s}
              label={PURCHASE_ORDER_STATUS_LABEL[s]}
              value={counts[s]}
            />
          ))}
        </div>

        <form className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by number, vendor, company…"
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <select
            name="status"
            defaultValue={statusRaw}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">All statuses</option>
            {PURCHASE_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PURCHASE_ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {filtersApplied ? (
            <Link href={`/workspace/${workspace.id}/purchase-orders`}>
              <Button type="button" variant="ghost" size="sm">
                Clear
              </Button>
            </Link>
          ) : null}
        </form>

        {ordersRaw.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-[16px] font-medium text-zinc-900 dark:text-zinc-100">
              {filtersApplied
                ? "No purchase orders match these filters"
                : "No purchase orders yet"}
            </h2>
            <p className="mt-1.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {filtersApplied
                ? "Clear filters or refine your search."
                : canManage
                  ? "Raise your first purchase order to a vendor."
                  : "Once orders are placed, they'll show up here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ordersRaw.map((o) => {
              const id = o._id.toString();
              const status = o.status as PurchaseOrderStatus;
              const orderDate = new Date(o.orderDate);
              const expectedDate = o.expectedDate ? new Date(o.expectedDate) : null;
              return (
                <VoucherCard
                  key={id}
                  voucher={{
                    id,
                    number: o.number,
                    partyName: o.vendor.name,
                    partyCompany: o.vendor.company ?? "",
                    primaryDate: format(orderDate, "MMM d, yyyy"),
                    primaryDateLabel: "Order date",
                    secondaryDate: expectedDate ? format(expectedDate, "MMM d, yyyy") : null,
                    secondaryDateLabel: "Expected",
                    currency: o.currency,
                    total: o.total,
                    itemCount: o.items?.length ?? 0,
                    status,
                    statusLabel: PURCHASE_ORDER_STATUS_LABEL[status],
                    statusBadgeClass: PURCHASE_ORDER_STATUS_BADGE_CLASS[status],
                  }}
                  editHref={`/workspace/${workspace.id}/purchase-orders/${id}/edit`}
                  canEdit={canManage}
                  extra={
                    canManage ? (
                      <DeleteVoucherButton
                        label="Remove purchase order"
                        entityName={o.number}
                        onDelete={deletePurchaseOrder.bind(null, workspace.id, id)}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold tabular-nums text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
