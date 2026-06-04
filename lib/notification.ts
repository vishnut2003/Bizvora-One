// Shared notification constants and types. Intentionally free of `server-only`
// so the client bell can import the labels/DTO type without pulling in the
// model or email machinery.

export const NOTIFICATION_TYPES = [
  "lead_assigned",
  "customer_assigned",
  "project_assigned",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  lead_assigned: "Lead assigned",
  customer_assigned: "Customer assigned",
  project_assigned: "Project assigned",
};

export const NOTIFICATION_ENTITY_TYPES = [
  "lead",
  "customer",
  "project",
] as const;
export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];

// Serializable shape returned by the notifications API and consumed by the
// client bell — never expose raw Mongoose documents across the boundary.
export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string; // ISO timestamp
};
