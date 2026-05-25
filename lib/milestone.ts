export const MILESTONE_STATUSES = ["open", "completed"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  open: "Open",
  completed: "Completed",
};

export const MILESTONE_STATUS_BADGE_CLASS: Record<MilestoneStatus, string> = {
  open: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  completed:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
};

export const MILESTONE_STATUS_DOT_CLASS: Record<MilestoneStatus, string> = {
  open: "bg-sky-500",
  completed: "bg-emerald-500",
};
