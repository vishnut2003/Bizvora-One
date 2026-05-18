export const USER_ROLES = [
  "owner",
  "admin",
  "sales_manager",
  "sales_executive",
  "accounts",
  "hr",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const AUTH_PROVIDERS = ["credentials", "google"] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
