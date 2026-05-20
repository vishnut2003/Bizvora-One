"use client";

import { useEffect } from "react";
import { Loader2, Users, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MentionSearchResult } from "../_lib/mentions";

type Props = {
  query: string;
  results: MentionSearchResult[];
  loading: boolean;
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (result: MentionSearchResult) => void;
};

export default function MentionPopover({
  query,
  results,
  loading,
  activeIndex,
  onHover,
  onSelect,
}: Props) {
  // Scroll the active row into view when navigating with arrow keys.
  useEffect(() => {
    const el = document.querySelector<HTMLLIElement>(
      `[data-mention-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_36px_-12px_rgba(24,24,27,0.18)] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span>Mention a contact</span>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
        ) : null}
        <span className="ml-auto text-[10.5px] normal-case tracking-normal text-zinc-400">
          ↑↓ to navigate · Enter to insert · Esc to dismiss
        </span>
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {results.length === 0 ? (
          <li className="px-3 py-3 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            {loading
              ? "Searching…"
              : query.trim().length === 0
                ? "Type a name, company, or email"
                : `No leads or customers match “${query}”`}
          </li>
        ) : (
          results.map((r, idx) => {
            const isActive = idx === activeIndex;
            const isCustomer = r.type === "customer";
            return (
              <li
                key={`${r.type}:${r.id}`}
                data-mention-index={idx}
                // Use onMouseDown so the click registers before the textarea
                // blur handler runs and tears the popover down.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(r);
                }}
                onMouseEnter={() => onHover(idx)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors",
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800/70"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                    isCustomer
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                  )}
                  aria-hidden
                >
                  {isCustomer ? (
                    <Users className="h-3.5 w-3.5" />
                  ) : (
                    <UserRound className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                    {r.name}
                  </p>
                  <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                    {r.subtitle}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    isCustomer
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                  )}
                >
                  {r.type}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
