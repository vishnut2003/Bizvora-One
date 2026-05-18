import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import type { WorkspaceColor } from "@/lib/workspace";
import type { UserRole } from "@/models/user";

const swatch: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

const accentBar: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-b from-violet-400 to-purple-600",
  fuchsia: "bg-gradient-to-b from-fuchsia-400 to-pink-600",
  blue: "bg-gradient-to-b from-blue-400 to-indigo-600",
  emerald: "bg-gradient-to-b from-emerald-400 to-teal-600",
  amber: "bg-gradient-to-b from-amber-400 to-orange-600",
  rose: "bg-gradient-to-b from-rose-400 to-red-600",
};

const avatarGlow: Record<WorkspaceColor, string> = {
  violet: "group-hover:shadow-violet-500/30",
  fuchsia: "group-hover:shadow-fuchsia-500/30",
  blue: "group-hover:shadow-blue-500/30",
  emerald: "group-hover:shadow-emerald-500/30",
  amber: "group-hover:shadow-amber-500/30",
  rose: "group-hover:shadow-rose-500/30",
};

export type WorkspaceCardData = {
  id: string;
  name: string;
  color: WorkspaceColor;
  memberCount: number;
  role: UserRole;
  updatedAt: string;
};

const roleLabel: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  accounts: "Accounts",
  hr: "HR",
};

const roleStyle: Record<UserRole, string> = {
  owner:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 dark:bg-primary/15 dark:ring-primary/25",
  admin:
    "bg-zinc-900/10 text-zinc-900 ring-1 ring-inset ring-zinc-900/15 dark:bg-zinc-100/10 dark:text-zinc-100 dark:ring-zinc-100/15",
  sales_manager:
    "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
  sales_executive:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  accounts:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  hr:
    "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
};

export default function WorkspaceCard({
  workspace,
}: {
  workspace: WorkspaceCardData;
}) {
  const initial = workspace.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className="group relative -mx-2 flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100",
          accentBar[workspace.color],
        )}
      />

      <span
        className={cn(
          "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg text-[15px] font-semibold text-white shadow-sm shadow-black/10 transition-shadow group-hover:shadow-lg",
          swatch[workspace.color],
          avatarGlow[workspace.color],
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
        />
        <span
          aria-hidden
          className="absolute inset-0 ring-1 ring-inset ring-white/15"
        />
        <span className="relative">{initial}</span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            {workspace.name}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              roleStyle[workspace.role],
            )}
          >
            {roleLabel[workspace.role]}
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
          <span className="tabular-nums">{workspace.memberCount}</span>{" "}
          {workspace.memberCount === 1 ? "member" : "members"}
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">·</span>
          Updated {timeAgo(workspace.updatedAt)}
        </p>
      </div>

      <span
        aria-hidden
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent text-zinc-300 transition-all group-hover:translate-x-0 group-hover:border-zinc-200 group-hover:bg-white group-hover:text-zinc-900 group-hover:shadow-sm dark:text-zinc-600 dark:group-hover:border-zinc-700 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-100"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
