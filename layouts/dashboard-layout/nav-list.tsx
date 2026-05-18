"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navSections, type NavItem } from "./nav";

export default function NavList({
  workspaceId,
  query = "",
  onNavigate,
}: {
  workspaceId: string;
  query?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/workspace/${workspaceId}`;
  const normalized = query.trim().toLowerCase();

  const filteredSections = normalized
    ? navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            item.label.toLowerCase().includes(normalized),
          ),
        }))
        .filter((section) => section.items.length > 0)
    : navSections;

  const renderItem = (item: NavItem) => {
    const isRoot = item.href === "" || item.href === "/";
    const href = isRoot ? base : base + item.href;
    const isActive = isRoot
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
    const Icon = item.icon;

    return (
      <Link
        key={item.label}
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all",
          isActive
            ? "bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent dark:from-primary/[0.14] dark:via-primary/[0.05]"
            : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40",
        )}
      >
        {isActive ? (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-secondary"
          />
        ) : null}

        {isActive ? (
          <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
            />
            <span
              aria-hidden
              className="absolute inset-0 ring-1 ring-inset ring-white/15"
            />
            <Icon className="relative h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center text-zinc-400 transition-colors group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200">
            <Icon className="h-4 w-4" />
          </span>
        )}

        <span
          className={cn(
            "flex-1 truncate text-[13px] transition-colors",
            isActive
              ? "font-semibold text-zinc-900 dark:text-white"
              : "font-medium text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-white",
          )}
        >
          {item.label}
        </span>

        {item.badge ? (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-all",
              isActive
                ? "bg-white text-primary shadow-sm ring-1 ring-primary/15 dark:bg-zinc-900 dark:ring-primary/25"
                : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700",
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  if (filteredSections.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-[12px] text-zinc-500 dark:text-zinc-400">
        No menu items match &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <>
      {filteredSections.map((section, index) => (
        <div key={section.heading}>
          {index > 0 ? (
            <div className="my-3 h-px bg-zinc-100 dark:bg-zinc-800" />
          ) : null}
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            {section.heading}
          </p>
          <nav className="space-y-0.5">{section.items.map(renderItem)}</nav>
        </div>
      ))}
    </>
  );
}
