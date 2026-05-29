import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  Building2,
  FileText,
  Pencil,
  Plus,
  Receipt as ReceiptIcon,
} from "lucide-react";
import type { FilterQuery } from "mongoose";
import { format } from "date-fns";
import Receipt, { type IReceipt } from "@/models/receipt";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PAYMENT_MODE_LABEL,
  RECEIPT_STATUSES,
  RECEIPT_STATUS_BADGE_CLASS,
  RECEIPT_STATUS_LABEL,
  VOUCHER_VIEWER_ROLES,
  canManageAnyVoucher,
  canViewAllVouchers,
  formatCurrency,
  type PaymentMode,
  type ReceiptStatus,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import { cn } from "@/lib/cn";
import DashboardLayout from "@/layouts/dashboard-layout";
import Button from "@/components/button";
import DeleteVoucherButton from "@/components/delete-voucher-button";
import { deleteReceipt } from "./actions";

export const metadata: Metadata = { title: "Receipts — BizvoraOne" };

type LeanReceipt = IReceipt & {
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
function isStatus(v: string): v is ReceiptStatus {
  return (RECEIPT_STATUSES as readonly string[]).includes(v);
}
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function ReceiptsPage({ params, searchParams }: Props) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VOUCHER_VIEWER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const q = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";

  const baseFilter: FilterQuery<IReceipt> = canViewAllVouchers(role)
    ? { workspace: workspaceId }
    : {
        workspace: workspaceId,
        $or: [
          { createdBy: session.user.id },
          { assignedTo: session.user.id },
        ],
      };

  const filter: FilterQuery<IReceipt> = { ...baseFilter };
  if (isStatus(statusRaw)) filter.status = statusRaw;
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [
          { number: re },
          { "customer.name": re },
          { "customer.company": re },
          { reference: re },
        ],
      },
    ];
  }

  const receiptsRaw = (await Receipt.find(filter)
    .sort({ receiptDate: -1 })
    .limit(500)
    .lean()) as unknown as LeanReceipt[];

  const totalCount = await Receipt.countDocuments(baseFilter);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthAgg = await Receipt.aggregate<{ total: number }>([
    {
      $match: {
        ...baseFilter,
        status: "cleared",
        currency: "INR",
        receiptDate: { $gte: monthStart },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const collectedThisMonth = monthAgg[0]?.total ?? 0;

  const canManage = canManageAnyVoucher(role);
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
                <ReceiptIcon className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Sales
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Receipts
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Money received from customers in{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            {canManage ? (
              <Link href={`/workspace/${workspace.id}/receipts/new`}>
                <Button type="button" variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Record receipt
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Total" value={totalCount} />
          <StatPill
            label="Collected this month (INR)"
            value={formatCurrency(collectedThisMonth, "INR")}
          />
          <StatPill label="Cleared" value={await Receipt.countDocuments({ ...baseFilter, status: "cleared" })} />
          <StatPill label="Cancelled / Bounced" value={(await Receipt.countDocuments({ ...baseFilter, status: { $in: ["cancelled", "bounced"] } }))} />
        </div>

        <form className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by number, customer, reference…"
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <select
            name="status"
            defaultValue={statusRaw}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">All statuses</option>
            {RECEIPT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RECEIPT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {filtersApplied ? (
            <Link href={`/workspace/${workspace.id}/receipts`}>
              <Button type="button" variant="ghost" size="sm">
                Clear
              </Button>
            </Link>
          ) : null}
        </form>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              {receiptsRaw.length} {receiptsRaw.length === 1 ? "receipt" : "receipts"}
            </h2>
          </div>

          {receiptsRaw.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
                <Banknote className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                {filtersApplied ? "No receipts match these filters." : "No receipts yet."}
              </p>
              <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                {filtersApplied
                  ? "Clear filters or refine your search."
                  : canManage
                    ? "Record your first customer receipt."
                    : "Once receipts are recorded, they'll show up here."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {receiptsRaw.map((r) => {
                const id = r._id.toString();
                const status = r.status as ReceiptStatus;
                const mode = r.paymentMode as PaymentMode;
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-start gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm">
                      <Banknote className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-mono text-[12px] tracking-tight text-zinc-500 dark:text-zinc-400">
                          {r.number}
                        </p>
                        <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {r.customer.name}
                        </p>
                        {r.customer.company ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                            <Building2 className="h-3 w-3" />
                            {r.customer.company}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                        {format(new Date(r.receiptDate), "MMM d, yyyy")} ·{" "}
                        {PAYMENT_MODE_LABEL[mode]}
                        {r.reference ? ` · Ref ${r.reference}` : ""}
                        {(r.allocations?.length ?? 0) > 0
                          ? ` · ${r.allocations!.length} invoice${r.allocations!.length === 1 ? "" : "s"}`
                          : " · On account"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="text-right">
                        <span className="text-[16px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                          {formatCurrency(r.amount, r.currency)}
                        </span>
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
                          RECEIPT_STATUS_BADGE_CLASS[status],
                        )}
                      >
                        {RECEIPT_STATUS_LABEL[status]}
                      </span>
                      <Link
                        href={`/workspace/${workspace.id}/receipts/${id}/pdf`}
                        aria-label={`View PDF for receipt ${r.number}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
                      >
                        <FileText className="h-3 w-3" />
                        PDF
                      </Link>
                      {canManage ? (
                        <>
                          <Link href={`/workspace/${workspace.id}/receipts/${id}/edit`}>
                            <Button type="button" variant="secondary" size="sm">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          </Link>
                          <DeleteVoucherButton
                            label="Remove receipt"
                            entityName={r.number}
                            onDelete={deleteReceipt.bind(null, workspace.id, id)}
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

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-semibold tabular-nums text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
