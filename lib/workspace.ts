export const WORKSPACE_COLORS = [
  "violet",
  "fuchsia",
  "blue",
  "emerald",
  "amber",
  "rose",
] as const;
export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number];

export const WORKSPACE_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

// Only active workspaces are usable. Missing status (legacy docs) is treated
// as active so workspaces created before this field existed stay accessible.
export function isWorkspaceAccessible(
  status: WorkspaceStatus | undefined | null,
): boolean {
  return (status ?? "active") === "active";
}

export const WORKSPACE_STATUS_LABEL: Record<WorkspaceStatus, string> = {
  pending: "Pending",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const WORKSPACE_STATUS_BADGE_CLASS: Record<WorkspaceStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  active:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  rejected:
    "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  suspended:
    "bg-zinc-200 text-zinc-700 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:ring-zinc-600/40",
};
