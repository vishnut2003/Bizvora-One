import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { WorkspaceColor } from "@/lib/workspace";
import type { UserRole } from "@/lib/user";
import MobileSidebar from "./mobile-sidebar";
import LogoutButton from "./logout-button";
import type { NavConfig } from "./nav";

const swatch: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

type HeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  workspace: {
    id: string;
    name: string;
    color: WorkspaceColor;
    role: UserRole;
  };
  nav?: NavConfig;
};

export default function Header({ user, workspace, nav }: HeaderProps) {
  const initial = workspace.name.charAt(0).toUpperCase();
  const userInitial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <MobileSidebar
            workspaceId={workspace.id}
            role={workspace.role}
            nav={nav}
          />
          <Link
            href="/"
            className="flex shrink-0 items-baseline text-[15px] font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Bizvora
            </span>
            <span className="ml-1 text-zinc-900 dark:text-white">One</span>
            <span
              aria-hidden
              className="ml-0.5 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-gradient-to-br from-primary to-secondary"
            />
          </Link>

          <span className="h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-800" />

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-[13px]"
          >
            <Link
              href="/workspace"
              className="hidden text-zinc-500 transition-colors hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-white"
            >
              Workspaces
            </Link>
            <ChevronRight className="hidden h-3.5 w-3.5 text-zinc-300 sm:inline dark:text-zinc-600" />
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[5px] text-[10px] font-semibold text-white shadow-sm shadow-black/10",
                  swatch[workspace.color],
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 ring-1 ring-inset ring-white/10"
                />
                <span className="relative">{initial}</span>
              </span>
              <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                {workspace.name}
              </span>
            </span>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LogoutButton user={user} userInitial={userInitial} />
        </div>
      </div>
    </header>
  );
}
