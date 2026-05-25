import Link from "next/link";
import {
  Building2,
  CalendarRange,
  Clock,
  FileText,
  Receipt,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import {
  QUOTATION_STATUS_BADGE_CLASS,
  QUOTATION_STATUS_DOT_CLASS,
  QUOTATION_STATUS_LABEL,
  formatCurrency,
  type QuotationStatus,
} from "@/lib/quotation";

export type QuotationCardData = {
  id: string;
  number: string;
  status: QuotationStatus;
  recipient: {
    kind: "customer" | "lead" | "custom";
    name: string;
    company: string;
  };
  currency: string;
  issueDate: string;
  validUntil: string | null;
  itemCount: number;
  total: number;
  updatedAt: string;
};

const STATUS_STRIPE: Record<QuotationStatus, string> = {
  draft: "from-zinc-300 via-zinc-400 to-zinc-500",
  sent: "from-sky-400 via-sky-500 to-blue-500",
  accepted: "from-emerald-400 via-emerald-500 to-teal-500",
  rejected: "from-rose-400 via-rose-500 to-red-500",
  expired: "from-amber-400 via-amber-500 to-orange-500",
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function QuotationCard({
  quotation,
  href,
  pdfHref,
}: {
  quotation: QuotationCardData;
  href: string;
  pdfHref: string;
}) {
  const kind = quotation.recipient.kind;
  const kindStyles =
    kind === "customer"
      ? {
          chip:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        }
      : kind === "lead"
        ? {
            chip:
              "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          }
        : {
            chip:
              "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
          };
  const KindIcon =
    kind === "customer" ? Users : kind === "lead" ? UserRound : UserPlus;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 pt-[22px] transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_38px_-18px_rgba(24,24,27,0.22)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r",
          STATUS_STRIPE[quotation.status],
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30",
          STATUS_STRIPE[quotation.status],
        )}
      />

      <div className="relative flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
            QUOTATION_STATUS_BADGE_CLASS[quotation.status],
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              QUOTATION_STATUS_DOT_CLASS[quotation.status],
            )}
          />
          {QUOTATION_STATUS_LABEL[quotation.status]}
        </span>
        <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-400 dark:text-zinc-500">
          <Clock className="h-2.5 w-2.5" />
          {timeAgo(new Date(quotation.updatedAt))}
        </span>
      </div>

      <p className="relative mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        {quotation.number}
      </p>

      <div className="relative mt-1 flex items-start gap-2">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full",
            kindStyles.chip,
          )}
          aria-hidden
        >
          <KindIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {quotation.recipient.name}
          </p>
          {quotation.recipient.company ? (
            <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
              <Building2 className="h-3 w-3" />
              {quotation.recipient.company}
            </p>
          ) : (
            <p className="mt-0.5 text-[11.5px] italic text-zinc-400 dark:text-zinc-500">
              {kind === "customer"
                ? "Customer"
                : kind === "lead"
                  ? "Lead"
                  : "Custom recipient"}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3 text-[11.5px] text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="h-3 w-3" />
          {shortDate(quotation.issueDate)}
          {quotation.validUntil
            ? ` → ${shortDate(quotation.validUntil)}`
            : ""}
        </span>
        <span className="inline-flex items-center gap-1">
          <Receipt className="h-3 w-3" />
          {quotation.itemCount}{" "}
          {quotation.itemCount === 1 ? "line" : "lines"}
        </span>
      </div>

      <div className="relative mt-auto flex items-end justify-between gap-3 pt-4">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Total
          </p>
          <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {formatCurrency(quotation.total, quotation.currency)}
          </p>
        </div>
        <Link
          href={pdfHref}
          aria-label={`View PDF for quotation ${quotation.number}`}
          className="relative z-20 inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white"
        >
          <FileText className="h-3 w-3" />
          View PDF
        </Link>
      </div>

      {/* Full-card overlay: clicking anywhere (except the PDF button above,
          which sits at a higher z-index) opens the quotation for editing. */}
      <Link
        href={href}
        aria-label={`Open quotation ${quotation.number}`}
        className="absolute inset-0 z-10 rounded-2xl"
      />
    </div>
  );
}
