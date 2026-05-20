import type { UserRole } from "@/lib/user";

export {
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  type LeadSource,
} from "@/lib/lead";

export const CUSTOMER_STATUSES = ["active", "inactive", "churned"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  churned: "Churned",
};

export const CUSTOMER_STATUS_BADGE_CLASS: Record<CustomerStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  inactive:
    "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25",
  churned:
    "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
};

export const CUSTOMER_STATUS_DOT_CLASS: Record<CustomerStatus, string> = {
  active: "bg-emerald-500",
  inactive: "bg-zinc-400 dark:bg-zinc-500",
  churned: "bg-rose-500",
};

export const CUSTOMER_ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "assignee_changed",
  "note_added",
  "tags_changed",
  "details_updated",
  "billing_updated",
  "project_linked",
] as const;
export type CustomerActivityType = (typeof CUSTOMER_ACTIVITY_TYPES)[number];

export const CUSTOMER_ACTIVITY_LABEL: Record<CustomerActivityType, string> = {
  created: "Customer created",
  status_changed: "Status changed",
  assignee_changed: "Reassigned",
  note_added: "Note added",
  tags_changed: "Tags updated",
  details_updated: "Details updated",
  billing_updated: "Billing details updated",
  project_linked: "Project linked",
};

// Human labels for the field keys emitted by the `details_updated` event.
export const CUSTOMER_FIELD_LABEL: Record<string, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  company: "company",
  jobTitle: "job title",
  website: "website",
  source: "source",
  city: "city",
  state: "state",
  country: "country",
};

export const CUSTOMER_VIEWER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "sales_manager",
  "sales_executive",
  "accounts",
  "project_manager",
  "team_member",
];

export const CUSTOMER_FULL_MANAGER_ROLES: UserRole[] = [
  "owner",
  "admin",
  "sales_manager",
];

// Roles that can create customers via the manual form. Accounts can onboard
// billable contacts directly; sales executives cannot add new customers.
export const CUSTOMER_CREATOR_ROLES: UserRole[] = [
  "owner",
  "admin",
  "sales_manager",
  "accounts",
];

export function canViewCustomers(role: UserRole): boolean {
  return CUSTOMER_VIEWER_ROLES.includes(role);
}

// Whether the actor can see every customer in the workspace.
// Sales executives are scoped to their own assigned customers.
export function canViewAllCustomers(role: UserRole): boolean {
  return role !== "sales_executive";
}

export function canManageAnyCustomer(role: UserRole): boolean {
  return CUSTOMER_FULL_MANAGER_ROLES.includes(role);
}

export function canCreateCustomer(role: UserRole): boolean {
  return CUSTOMER_CREATOR_ROLES.includes(role);
}

// Converting a lead into a customer is a sales workflow — accounts can add
// customers manually but doesn't have access to the leads pipeline.
export function canConvertLeadToCustomer(role: UserRole): boolean {
  return CUSTOMER_FULL_MANAGER_ROLES.includes(role);
}

export function canManageCustomer(
  role: UserRole,
  userId: string,
  assignedTo: string | null | undefined,
): boolean {
  if (canManageAnyCustomer(role)) return true;
  if (role === "sales_executive" && assignedTo && assignedTo === userId)
    return true;
  return false;
}
