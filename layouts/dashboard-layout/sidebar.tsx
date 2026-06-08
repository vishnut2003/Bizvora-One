"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/lib/user";
import NavList from "./nav-list";
import FeedbackCard from "./feedback-card";
import type { NavConfig } from "./nav";

export default function Sidebar({
  workspaceId,
  role,
  compact = false,
  nav,
}: {
  workspaceId: string;
  role: UserRole;
  compact?: boolean;
  nav?: NavConfig;
}) {
  const [query, setQuery] = useState("");

  return (
    <aside
      className={cn(
        "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-zinc-200 bg-white/40 py-4 backdrop-blur-sm lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-900/30",
        compact ? "w-16 px-2" : "w-64 px-3",
      )}
    >
      {compact ? null : (
        <div className="relative shrink-0">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="search"
            placeholder="Search…"
            aria-label="Search menu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-10 text-[12.5px] text-zinc-900 placeholder:text-zinc-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:appearance-none"
          />
          <kbd className="pointer-events-none absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          compact
            ? "no-scrollbar -mx-2 mt-1 px-2"
            : "-mx-3 mt-5 px-3 [scrollbar-gutter:stable]",
        )}
      >
        <NavList
          workspaceId={workspaceId}
          role={role}
          query={query}
          compact={compact}
          nav={nav}
        />
      </div>

      {compact ? null : <FeedbackCard workspaceId={workspaceId} />}
    </aside>
  );
}
