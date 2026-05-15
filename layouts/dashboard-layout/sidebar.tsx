"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
};

const primaryNav: NavItem[] = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/deals", label: "Deals", icon: Briefcase, badge: "9" },
  { href: "/pipelines", label: "Pipelines", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const secondaryNav: NavItem[] = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const base = `/workspace/${workspaceId}`;

  const renderItem = (item: NavItem) => {
    const href = base + item.href;
    const isActive =
      item.href === "" ? pathname === href : pathname.startsWith(href);
    const Icon = item.icon;

    return (
      <Link
        key={item.label}
        href={href}
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

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-zinc-200 bg-white/40 px-3 py-4 backdrop-blur-sm lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
        <input
          type="search"
          placeholder="Search…"
          aria-label="Search"
          className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-10 text-[12.5px] text-zinc-900 placeholder:text-zinc-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </div>

      <p className="mt-5 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        Workspace
      </p>
      <nav className="space-y-0.5">{primaryNav.map(renderItem)}</nav>

      <div className="my-4 h-px bg-zinc-100 dark:bg-zinc-800" />

      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        Manage
      </p>
      <nav className="space-y-0.5">{secondaryNav.map(renderItem)}</nav>

      <div className="mt-auto">
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-gradient-to-br from-white via-white to-primary/5 p-3 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-primary/10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 blur-2xl"
          />
          <div className="relative flex items-start gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
                On the beta plan
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Free during beta. Invite teammates with no per-seat cost.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
