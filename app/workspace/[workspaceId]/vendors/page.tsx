import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  IdCard,
  Mail,
  Phone,
  Pencil,
  Plus,
  Truck,
} from "lucide-react";
import type { FilterQuery } from "mongoose";
import Vendor, {
  VENDOR_STATUSES,
  VENDOR_STATUS_BADGE_CLASS,
  VENDOR_STATUS_DOT_CLASS,
  VENDOR_STATUS_LABEL,
  type IVendor,
  type VendorStatus,
} from "@/models/vendor";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  VENDOR_VIEWER_ROLES,
  canManageVendors,
} from "@/lib/voucher";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";
import RemoveVendorButton from "./_components/remove-vendor-button";

export const metadata: Metadata = {
  title: "Vendors — BizvoraOne",
};

type VendorsPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LeanVendor = IVendor & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function isVendorStatus(v: string): v is VendorStatus {
  return (VENDOR_STATUSES as readonly string[]).includes(v);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function VendorsPage({
  params,
  searchParams,
}: VendorsPageProps) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VENDOR_VIEWER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const q = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";

  const filter: FilterQuery<IVendor> = { workspace: workspaceId };
  if (isVendorStatus(statusRaw)) filter.status = statusRaw;
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { name: re },
      { displayName: re },
      { email: re },
      { phone: re },
      { gstin: re },
    ];
  }

  const vendorsRaw = (await Vendor.find(filter)
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean()) as unknown as LeanVendor[];

  const totalActive = await Vendor.countDocuments({
    workspace: workspaceId,
    status: "active",
  });
  const totalInactive = await Vendor.countDocuments({
    workspace: workspaceId,
    status: "inactive",
  });

  const canManage = canManageVendors(role);
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
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <Truck className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Accounts
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Vendors
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Suppliers and service providers you raise purchase vouchers
                  for in{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            {canManage ? (
              <Link href={`/workspace/${workspace.id}/vendors/new`}>
                <Button type="button" variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New vendor
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total" value={totalActive + totalInactive} accent="from-primary to-secondary" />
          <StatCard label="Active" value={totalActive} accent="from-emerald-500 to-teal-600" />
          <StatCard label="Inactive" value={totalInactive} accent="from-zinc-500 to-zinc-700" />
        </div>

        <form className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name, company, email, or GSTIN…"
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <select
            name="status"
            defaultValue={statusRaw}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">All statuses</option>
            {VENDOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VENDOR_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {filtersApplied ? (
            <Link href={`/workspace/${workspace.id}/vendors`}>
              <Button type="button" variant="ghost" size="sm">
                Clear
              </Button>
            </Link>
          ) : null}
        </form>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              {vendorsRaw.length} {vendorsRaw.length === 1 ? "vendor" : "vendors"}
            </h2>
          </div>

          {vendorsRaw.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
                <Truck className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                {filtersApplied ? "No vendors match these filters." : "No vendors yet."}
              </p>
              <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                {filtersApplied
                  ? "Clear filters or refine your search."
                  : canManage
                    ? "Add your first supplier to start raising purchase orders and invoices."
                    : "Vendors will appear here once an admin adds them."}
              </p>
              {!filtersApplied && canManage ? (
                <div className="mt-5">
                  <Link href={`/workspace/${workspace.id}/vendors/new`}>
                    <Button type="button" variant="primary" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      New vendor
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {vendorsRaw.map((v) => {
                const id = v._id.toString();
                const status = v.status as VendorStatus;
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-start gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-[14px] font-semibold text-white shadow-sm">
                      {v.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {v.displayName || v.name}
                        </p>
                        {v.displayName && v.displayName !== v.name ? (
                          <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                            ({v.name})
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                        {v.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {v.email}
                          </span>
                        ) : null}
                        {v.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {v.phone}
                          </span>
                        ) : null}
                        {v.contactPerson ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {v.contactPerson}
                          </span>
                        ) : null}
                        {v.gstin ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10.5px]">
                            <IdCard className="h-3 w-3" />
                            {v.gstin}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                          VENDOR_STATUS_BADGE_CLASS[status],
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            VENDOR_STATUS_DOT_CLASS[status],
                          )}
                        />
                        {VENDOR_STATUS_LABEL[status]}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {timeAgo(new Date(v.updatedAt))}
                      </span>
                      {canManage ? (
                        <>
                          <Link
                            href={`/workspace/${workspace.id}/vendors/${id}/edit`}
                          >
                            <Button type="button" variant="secondary" size="sm">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          </Link>
                          <RemoveVendorButton
                            workspaceId={workspace.id}
                            vendorId={id}
                            vendorName={v.name}
                          />
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl ${accent}`}
      />
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
