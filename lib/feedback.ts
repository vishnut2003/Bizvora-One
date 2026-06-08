// Shared feedback constants and types. Intentionally free of `server-only` so
// the sidebar form and the admin list can import the labels/DTO type without
// pulling in the Mongoose model.

export const FEEDBACK_CATEGORIES = ["bug", "idea", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: "Bug",
  idea: "Idea",
  other: "Other",
};

export const FEEDBACK_STATUSES = ["new", "reviewed", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  resolved: "Resolved",
};

export const FEEDBACK_MESSAGE_MAX = 2000;

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === "string" &&
    (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return (
    typeof value === "string" &&
    (FEEDBACK_STATUSES as readonly string[]).includes(value)
  );
}

// Serializable shape returned to the admin list — never expose raw Mongoose
// documents across the boundary.
export type FeedbackDTO = {
  id: string;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  authorName: string;
  authorEmail: string;
  workspaceName: string;
  createdAt: string; // ISO timestamp
};
