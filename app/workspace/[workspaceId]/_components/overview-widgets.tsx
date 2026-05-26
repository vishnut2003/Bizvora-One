import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTile = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
  href?: string;
};

export function StatTileCard({ tile }: { tile: StatTile }) {
  const Icon = tile.icon;
  const body = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all dark:border-zinc-800 dark:bg-zinc-900",
        tile.href
          ? "hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-700"
          : "",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl transition-opacity group-hover:opacity-[0.18]",
          tile.accent,
        )}
      />
      <div className="relative flex items-start justify-between">
        <p className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {tile.label}
        </p>
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm",
            tile.accent,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="relative mt-3 truncate text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
        {tile.value}
      </p>
      {tile.hint ? (
        <p className="relative mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          {tile.hint}
        </p>
      ) : null}
    </div>
  );
  return tile.href ? <Link href={tile.href}>{body}</Link> : body;
}

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent = "from-primary to-secondary",
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "relative grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-gradient-to-br text-white shadow-sm",
              accent,
            )}
          >
            <Icon className="relative h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="text-[11.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {actionLabel} →
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export type DistributionRow = {
  label: string;
  count: number;
  color: string; // tailwind background class for dot/bar (e.g. "bg-sky-500")
};

export function DistributionList({
  rows,
  empty,
}: {
  rows: DistributionRow[];
  empty?: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) {
    return (
      <div className="px-5 py-10 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
        {empty ?? "Nothing here yet."}
      </div>
    );
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
                key={r.label}
                className={cn(
                  "h-full first:rounded-l-full last:rounded-r-full transition-all",
                  r.color,
                )}
                style={{ width: `${pct}%` }}
                title={`${r.label}: ${r.count}`}
              />
            );
          })}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-[12px]">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", r.color)}
              aria-hidden
            />
            <span className="truncate text-zinc-600 dark:text-zinc-400">
              {r.label}
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

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-10 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
      {children}
    </div>
  );
}

export function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 transition-colors hover:border-primary hover:bg-primary/[0.04] hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
    >
      <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
      {label}
    </Link>
  );
}
