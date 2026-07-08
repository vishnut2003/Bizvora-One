import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

type DocsCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  /** Small caption below the description, e.g. "1 guide" or "Updated 2 Jul 2026". */
  meta?: string;
  /** Optional pill next to the title, e.g. "New". */
  badge?: string;
};

/**
 * A linkable card used across the docs section — both for category cards on
 * `/docs` and for doc cards on a category page. Whole card is clickable.
 * Shell mirrors the landing-page module cards for visual consistency.
 */
export default function DocsCard({
  href,
  icon,
  title,
  description,
  meta,
  badge,
}: DocsCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-linear-to-br from-primary/15 to-secondary/15 text-primary ring-1 ring-inset ring-primary/20">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h3>
              {badge ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                  <Sparkles className="h-2.5 w-2.5" />
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-700" />
      </div>

      {meta ? (
        <p className="mt-4 pl-14 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
          {meta}
        </p>
      ) : null}
    </Link>
  );
}
