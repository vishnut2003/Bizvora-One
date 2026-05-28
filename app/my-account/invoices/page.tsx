import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Receipt } from "lucide-react";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Subscription from "@/models/subscription";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/billing";
import type { WorkspaceColor } from "@/lib/workspace";

const dotColor: Record<WorkspaceColor, string> = {
  violet: "bg-violet-500",
  fuchsia: "bg-fuchsia-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

type LeanInvoice = {
  razorpayInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  issuedAt: Date;
  paidAt: Date | null;
  hostedInvoiceUrl: string | null;
};

type LeanSubForInvoices = {
  workspace: { name?: string; color?: WorkspaceColor } | null;
  invoices: LeanInvoice[];
};

type InvoiceRow = {
  id: string;
  workspaceName: string;
  workspaceColor: WorkspaceColor;
  amount: number;
  currency: string;
  status: string;
  issuedAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  hostedInvoiceUrl: string | null;
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPeriod(start: Date | null, end: Date | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start ?? end);
}

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  issued: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  expired: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const subs = (await Subscription.find({ owner: session.user.id })
    .populate<{ workspace: { name?: string; color?: WorkspaceColor } | null }>(
      "workspace",
      "name color",
    )
    .lean()) as unknown as LeanSubForInvoices[];

  const rows: InvoiceRow[] = subs
    .flatMap((s) =>
      (s.invoices ?? []).map((inv) => ({
        id: inv.razorpayInvoiceId,
        workspaceName: s.workspace?.name ?? "Workspace",
        workspaceColor: (s.workspace?.color ?? "violet") as WorkspaceColor,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        issuedAt: inv.issuedAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        hostedInvoiceUrl: inv.hostedInvoiceUrl,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
    );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
          Billing history
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
          Invoices
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          {rows.length} invoice{rows.length === 1 ? "" : "s"} across all your
          subscriptions. PDFs are issued by Razorpay.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Receipt className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-[14px] font-medium text-zinc-700 dark:text-zinc-200">
            No invoices yet.
          </p>
          <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
            Invoices appear here after your first successful charge.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-full text-[12.5px]">
            <thead className="border-b border-zinc-100 bg-zinc-50/50 text-left text-[10px] uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Workspace</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Period
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {formatDate(r.issuedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 w-2 rounded-full",
                          dotColor[r.workspaceColor],
                        )}
                      />
                      <span className="truncate">{r.workspaceName}</span>
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-zinc-500 sm:table-cell dark:text-zinc-400">
                    {formatPeriod(r.periodStart, r.periodEnd)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPaise(r.amount, r.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        STATUS_BADGE[r.status] ??
                          "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {r.hostedInvoiceUrl ? (
                      <Link
                        href={r.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
