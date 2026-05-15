import Link from "next/link";
import { Bell, ChevronRight, LogOut } from "lucide-react";
import { signOut } from "@/config/auth";
import { cn } from "@/lib/cn";
import type { WorkspaceColor } from "@/lib/workspace";

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
    name: string;
    color: WorkspaceColor;
  };
};

export default function Header({ user, workspace }: HeaderProps) {
  const initial = workspace.name.charAt(0).toUpperCase();
  const userInitial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-baseline text-[15px] font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              WSS
            </span>
            <span className="ml-1 text-zinc-900 dark:text-white">CRM</span>
            <span
              aria-hidden
              className="ml-0.5 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-gradient-to-br from-primary to-secondary"
            />
          </Link>

          <span className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[13px]"
          >
            <Link
              href="/workspace"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Workspaces
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" />
            <span className="flex items-center gap-2">
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
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {workspace.name}
              </span>
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
          >
            <Bell className="h-4 w-4" />
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary to-secondary ring-2 ring-white dark:ring-zinc-900"
            />
          </button>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white pl-1 pr-2 text-[12px] text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-6 w-6 rounded-[5px] ring-1 ring-zinc-200 dark:ring-zinc-700"
                />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-gradient-to-br from-primary to-secondary text-[10px] font-semibold text-white">
                  {userInitial}
                </span>
              )}
              <span className="hidden max-w-[160px] truncate sm:inline">
                {user.email ?? user.name}
              </span>
              <span className="mx-0.5 hidden h-3 w-px bg-zinc-200 sm:inline-block dark:bg-zinc-700" />
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
