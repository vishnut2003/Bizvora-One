"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { accountNav } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-zinc-200 bg-white/40 px-3 py-5 backdrop-blur-sm lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        My account
      </p>
      <nav className="space-y-0.5">
        {accountNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all",
                isActive
                  ? "bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent dark:from-primary/[0.14] dark:via-primary/[0.05]"
                  : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40",
              )}
            >
              {isActive ? (
                <>
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-secondary"
                  />
                  <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30">
                    <Icon className="relative h-3.5 w-3.5" />
                  </span>
                </>
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
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-3">
        <Link
          href="/workspace"
          className="block rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[12px] text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← Back to workspaces
        </Link>
      </div>
    </aside>
  );
}
