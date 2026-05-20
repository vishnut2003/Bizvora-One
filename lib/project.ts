import type { UserRole } from "@/lib/user";

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PROJECT_STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  planning:
    "bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
  active:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  on_hold:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  completed:
    "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25",
  cancelled:
    "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
};

export const PROJECT_STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  planning: "bg-indigo-500",
  active: "bg-emerald-500",
  on_hold: "bg-amber-500",
  completed: "bg-zinc-400 dark:bg-zinc-500",
  cancelled: "bg-rose-500",
};

export const PROJECT_VIEWER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "project_manager",
  "team_member",
];

export const PROJECT_MANAGER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "project_manager",
];

export function canViewProjects(role: UserRole): boolean {
  return PROJECT_VIEWER_ROLES.includes(role);
}

// Whether the actor can see every project in the workspace. Team members are
// scoped to projects whose `team` list includes their user id.
export function canViewAllProjects(role: UserRole): boolean {
  return role !== "team_member";
}

export function canManageProjects(role: UserRole): boolean {
  return PROJECT_MANAGER_ROLES.includes(role);
}
