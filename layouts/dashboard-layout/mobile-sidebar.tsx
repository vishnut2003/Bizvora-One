"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import NavList from "./nav-list";

const subscribe = () => () => {};

export default function MobileSidebar({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const drawer = (
    <div className="lg:hidden">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm transition-opacity dark:bg-black/60",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white px-3 py-4 shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between">
          <span className="flex items-baseline text-[15px] font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              WSS
            </span>
            <span className="ml-1 text-zinc-900 dark:text-white">CRM</span>
            <span
              aria-hidden
              className="ml-0.5 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-gradient-to-br from-primary to-secondary"
            />
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4 shrink-0">
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
            className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-2 text-[12.5px] text-zinc-900 placeholder:text-zinc-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        <div className="-mx-3 mt-4 min-h-0 flex-1 overflow-y-auto px-3 [scrollbar-gutter:stable] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
          <NavList
            workspaceId={workspaceId}
            query={query}
            onNavigate={() => {
              setOpen(false);
              setQuery("");
            }}
          />
        </div>

        <div className="shrink-0 pt-3">
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
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 lg:hidden dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white"
      >
        <Menu className="h-4 w-4" />
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
