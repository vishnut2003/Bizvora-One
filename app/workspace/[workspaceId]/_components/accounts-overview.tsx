import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Receipt as ReceiptIcon,
  ReceiptText,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import mongoose from "mongoose";
import SalesInvoice from "@/models/sales-invoice";
import PurchaseInvoice from "@/models/purchase-invoice";
import Receipt_ from "@/models/receipt";
import Payment from "@/models/payment";
import { formatCurrency } from "@/lib/voucher";
import { EmptyRow, SectionCard, type StatTile } from "./overview-widgets";
import { SecondaryStatStrip, StatGrid } from "./executive-overview";

export default async function AccountsOverview({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    receivablesAgg,
    payablesAgg,
    overdueReceivablesAgg,
    overduePayablesAgg,
    collectedThisMonth,
    paidThisMonth,
    overdueSalesInvoices,
    overduePurchaseInvoices,
    recentReceipts,
    recentPayments,
    receivablesByStatus,
    payablesByStatus,
  ] = await Promise.all([
    SalesInvoice.aggregate<{ owed: number; count: number }>([
      {
        $match: {
          workspace: wsObj,
          status: { $in: ["unpaid", "partial", "overdue"] },
          currency: "INR",
        },
      },
      {
        $group: {
          _id: null,
          owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    PurchaseInvoice.aggregate<{ owed: number; count: number }>([
      {
        $match: {
          workspace: wsObj,
          status: { $in: ["unpaid", "partial", "overdue"] },
          currency: "INR",
        },
      },
      {
        $group: {
          _id: null,
          owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    SalesInvoice.aggregate<{ owed: number; count: number }>([
      {
        $match: {
          workspace: wsObj,
          status: { $in: ["unpaid", "partial", "overdue"] },
          dueDate: { $lt: today },
          currency: "INR",
        },
      },
      {
        $group: {
          _id: null,
          owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    PurchaseInvoice.aggregate<{ owed: number; count: number }>([
      {
        $match: {
          workspace: wsObj,
          status: { $in: ["unpaid", "partial", "overdue"] },
          dueDate: { $lt: today },
          currency: "INR",
        },
      },
      {
        $group: {
          _id: null,
          owed: { $sum: { $subtract: ["$total", "$amountPaid"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Receipt_.aggregate<{ total: number }>([
      {
        $match: {
          workspace: wsObj,
          status: "cleared",
          currency: "INR",
          receiptDate: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate<{ total: number }>([
      {
        $match: {
          workspace: wsObj,
          status: "cleared",
          currency: "INR",
          paymentDate: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    SalesInvoice.find({
      workspace: workspaceId,
      status: { $in: ["unpaid", "partial", "overdue"] },
      dueDate: { $lt: today },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .select({ number: 1, customer: 1, total: 1, amountPaid: 1, currency: 1, dueDate: 1 })
      .lean(),
    PurchaseInvoice.find({
      workspace: workspaceId,
      status: { $in: ["unpaid", "partial", "overdue"] },
      dueDate: { $lt: today },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .select({ number: 1, vendor: 1, total: 1, amountPaid: 1, currency: 1, dueDate: 1 })
      .lean(),
    Receipt_.find({ workspace: workspaceId, status: "cleared" })
      .sort({ receiptDate: -1 })
      .limit(5)
      .select({ number: 1, customer: 1, amount: 1, currency: 1, receiptDate: 1, paymentMode: 1 })
      .lean(),
    Payment.find({ workspace: workspaceId, status: "cleared" })
      .sort({ paymentDate: -1 })
      .limit(5)
      .select({ number: 1, vendor: 1, amount: 1, currency: 1, paymentDate: 1, paymentMode: 1 })
      .lean(),
    SalesInvoice.aggregate<{ _id: string; count: number }>([
      { $match: { workspace: wsObj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    PurchaseInvoice.aggregate<{ _id: string; count: number }>([
      { $match: { workspace: wsObj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const recv = receivablesAgg[0]?.owed ?? 0;
  const recvCount = receivablesAgg[0]?.count ?? 0;
  const pay = payablesAgg[0]?.owed ?? 0;
  const payCount = payablesAgg[0]?.count ?? 0;
  const overdueRecv = overdueReceivablesAgg[0]?.owed ?? 0;
  const overdueRecvCount = overdueReceivablesAgg[0]?.count ?? 0;
  const overduePay = overduePayablesAgg[0]?.owed ?? 0;
  const overduePayCount = overduePayablesAgg[0]?.count ?? 0;
  const collected = collectedThisMonth[0]?.total ?? 0;
  const paid = paidThisMonth[0]?.total ?? 0;

  const tiles: StatTile[] = [
    {
      label: "Receivable (INR)",
      value: formatCurrency(recv, "INR"),
      hint: `${recvCount} open invoice${recvCount === 1 ? "" : "s"}`,
      icon: Banknote,
      accent: "from-emerald-500 to-teal-600",
      href: `/workspace/${workspaceId}/sale-invoices`,
    },
    {
      label: "Payable (INR)",
      value: formatCurrency(pay, "INR"),
      hint: `${payCount} vendor bill${payCount === 1 ? "" : "s"}`,
      icon: Wallet,
      accent: "from-rose-500 to-red-600",
      href: `/workspace/${workspaceId}/purchase-invoices`,
    },
    {
      label: "Collected this month (INR)",
      value: formatCurrency(collected, "INR"),
      hint: "Cleared receipts",
      icon: ReceiptIcon,
      accent: "from-violet-500 to-purple-700",
      href: `/workspace/${workspaceId}/receipts`,
    },
    {
      label: "Paid this month (INR)",
      value: formatCurrency(paid, "INR"),
      hint: "Cleared payments",
      icon: CreditCard,
      accent: "from-blue-500 to-indigo-700",
      href: `/workspace/${workspaceId}/payments`,
    },
  ];

  return (
    <>
      <StatGrid tiles={tiles} />

      <SecondaryStatStrip
        items={[
          {
            label: "Overdue receivables (INR)",
            value: formatCurrency(overdueRecv, "INR"),
            icon: AlertTriangle,
          },
          {
            label: "Overdue invoices",
            value: String(overdueRecvCount),
            icon: AlertTriangle,
          },
          {
            label: "Overdue payables (INR)",
            value: formatCurrency(overduePay, "INR"),
            icon: TrendingDown,
          },
          {
            label: "Overdue bills",
            value: String(overduePayCount),
            icon: TrendingDown,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          icon={AlertTriangle}
          title="Top overdue receivables"
          subtitle="Customers who owe you the longest"
          accent="from-rose-500 to-red-600"
          actionLabel="Recovery"
          actionHref={`/workspace/${workspaceId}/recovery`}
        >
          {overdueSalesInvoices.length === 0 ? (
            <EmptyRow>No overdue receivables — nicely done.</EmptyRow>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                overdueSalesInvoices as unknown as Array<{
                  _id: { toString(): string };
                  number: string;
                  customer: { name: string; company?: string };
                  total: number;
                  amountPaid: number;
                  currency: string;
                  dueDate: Date;
                }>
              ).map((inv) => {
                const balance = Math.max(0, inv.total - (inv.amountPaid ?? 0));
                const daysOverdue = Math.round(
                  (today.getTime() - new Date(inv.dueDate).getTime()) /
                    86_400_000,
                );
                return (
                  <li
                    key={inv._id.toString()}
                    className="flex items-start gap-3 px-5 py-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {inv.number}
                      </p>
                      <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {inv.customer.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                        {daysOverdue}d overdue · due{" "}
                        {format(new Date(inv.dueDate), "MMM d")}
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="block text-[14px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatCurrency(balance, inv.currency)}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={TrendingDown}
          title="Top overdue payables"
          subtitle="Vendor bills past due"
          accent="from-amber-500 to-orange-600"
          actionLabel="Purchase invoices"
          actionHref={`/workspace/${workspaceId}/purchase-invoices`}
        >
          {overduePurchaseInvoices.length === 0 ? (
            <EmptyRow>No overdue payables.</EmptyRow>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                overduePurchaseInvoices as unknown as Array<{
                  _id: { toString(): string };
                  number: string;
                  vendor: { name: string; company?: string };
                  total: number;
                  amountPaid: number;
                  currency: string;
                  dueDate: Date;
                }>
              ).map((inv) => {
                const balance = Math.max(0, inv.total - (inv.amountPaid ?? 0));
                const daysOverdue = Math.round(
                  (today.getTime() - new Date(inv.dueDate).getTime()) /
                    86_400_000,
                );
                return (
                  <li
                    key={inv._id.toString()}
                    className="flex items-start gap-3 px-5 py-3 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {inv.number}
                      </p>
                      <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {inv.vendor.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                        {daysOverdue}d overdue · due{" "}
                        {format(new Date(inv.dueDate), "MMM d")}
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="block text-[14px] font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatCurrency(balance, inv.currency)}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          icon={ReceiptIcon}
          title="Recent receipts"
          subtitle="Inbound payments"
          accent="from-emerald-500 to-teal-600"
          actionLabel="Open receipts"
          actionHref={`/workspace/${workspaceId}/receipts`}
        >
          {recentReceipts.length === 0 ? (
            <EmptyRow>No receipts yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                recentReceipts as unknown as Array<{
                  _id: { toString(): string };
                  number: string;
                  customer: { name: string };
                  amount: number;
                  currency: string;
                  receiptDate: Date;
                }>
              ).map((r) => (
                <li
                  key={r._id.toString()}
                  className="flex items-start gap-3 px-5 py-3 text-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {r.number}
                    </p>
                    <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {r.customer.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {format(new Date(r.receiptDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-right text-[14px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(r.amount, r.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          icon={CreditCard}
          title="Recent payments"
          subtitle="Outbound payments"
          accent="from-blue-500 to-indigo-700"
          actionLabel="Open payments"
          actionHref={`/workspace/${workspaceId}/payments`}
        >
          {recentPayments.length === 0 ? (
            <EmptyRow>No payments yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(
                recentPayments as unknown as Array<{
                  _id: { toString(): string };
                  number: string;
                  vendor: { name: string };
                  amount: number;
                  currency: string;
                  paymentDate: Date;
                }>
              ).map((p) => (
                <li
                  key={p._id.toString()}
                  className="flex items-start gap-3 px-5 py-3 text-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {p.number}
                    </p>
                    <p className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {p.vendor.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {format(new Date(p.paymentDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-right text-[14px] font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatCurrency(p.amount, p.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          icon={ReceiptText}
          title="Receivables by status"
          accent="from-emerald-500 to-teal-600"
        >
          <StatusBars rows={receivablesByStatus} kind="sales" />
        </SectionCard>
        <SectionCard
          icon={ReceiptText}
          title="Payables by status"
          accent="from-rose-500 to-red-600"
        >
          <StatusBars rows={payablesByStatus} kind="purchase" />
        </SectionCard>
      </div>
    </>
  );
}

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  unpaid: "bg-zinc-400",
  partial: "bg-amber-500",
  paid: "bg-emerald-500",
  overdue: "bg-rose-500",
  cancelled: "bg-violet-500",
};

function StatusBars({
  rows,
  kind,
}: {
  rows: Array<{ _id: string; count: number }>;
  kind: "sales" | "purchase";
}) {
  void kind;
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) {
    return <EmptyRow>No invoices yet.</EmptyRow>;
  }
  return (
    <div className="p-5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {rows
          .filter((r) => r.count > 0)
          .map((r) => {
            const pct = (r.count / total) * 100;
            return (
              <div
                key={r._id}
                className={`h-full first:rounded-l-full last:rounded-r-full transition-all ${STATUS_COLOR[r._id] ?? "bg-zinc-400"}`}
                style={{ width: `${pct}%` }}
                title={`${STATUS_LABEL[r._id] ?? r._id}: ${r.count}`}
              />
            );
          })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <li key={r._id} className="flex items-center gap-2 text-[12px]">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLOR[r._id] ?? "bg-zinc-400"}`}
              aria-hidden
            />
            <span className="truncate text-zinc-600 dark:text-zinc-400">
              {STATUS_LABEL[r._id] ?? r._id}
            </span>
            <span className="ml-auto font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
              {r.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
