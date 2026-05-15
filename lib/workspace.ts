export const WORKSPACE_MEMBER_ROLES = ["owner", "admin", "member"] as const;
export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];

export const WORKSPACE_COLORS = [
  "violet",
  "fuchsia",
  "blue",
  "emerald",
  "amber",
  "rose",
] as const;
export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number];
