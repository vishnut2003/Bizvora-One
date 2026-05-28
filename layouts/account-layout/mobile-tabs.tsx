"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { accountNav } from "./nav";

export default function MobileTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-zinc-200 bg-white/80 px-2 backdrop-blur-sm lg:hidden dark:border-zinc-800 dark:bg-zinc-950/60">
      <nav className="flex gap-1 overflow-x-auto">
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
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-primary text-zinc-900 dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
