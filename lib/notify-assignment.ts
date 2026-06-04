import "server-only";
import { createElement } from "react";
import { connectDB } from "@/config/db";
import Notification from "@/models/notification";
import User from "@/models/user";
import { sendEmail } from "@/lib/email";
import { getPublicBaseUrl } from "@/lib/integration";
import AssignmentEmail from "@/emails/assignment-email";
import type {
  NotificationEntityType,
  NotificationType,
} from "@/lib/notification";

export type AssignmentNotice = {
  workspaceId: string;
  workspaceName: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  entityName: string;
  // In-app href (relative path) to open the resource.
  link: string;
};

const ENTITY_LABEL: Record<NotificationEntityType, string> = {
  lead: "lead",
  customer: "customer",
  project: "project",
};

function buildTitle(entityType: NotificationEntityType): string {
  return `You were assigned a ${ENTITY_LABEL[entityType]}`;
}

function buildBody(actorName: string, entityName: string): string {
  return `${actorName} assigned you "${entityName}"`;
}

/**
 * Create an in-app notification for the assignee and send them an email.
 * Best-effort: never throws — failures are logged so the calling action's
 * primary work (the save) is never rolled back.
 */
export async function notifyAssignment(notice: AssignmentNotice): Promise<void> {
  try {
    await connectDB();

    const [recipient, actor] = await Promise.all([
      User.findById(notice.recipientId).select("name email").lean(),
      User.findById(notice.actorId).select("name").lean(),
    ]);

    const actorName = actor?.name?.trim() || "Someone";
    const recipientName = recipient?.name?.trim() || "there";
    const title = buildTitle(notice.entityType);
    const body = buildBody(actorName, notice.entityName);

    await Notification.create({
      workspace: notice.workspaceId,
      recipient: notice.recipientId,
      actor: notice.actorId,
      type: notice.type,
      entityType: notice.entityType,
      entityId: notice.entityId,
      title,
      body,
      link: notice.link,
      read: false,
    });

    if (recipient?.email) {
      const base = getPublicBaseUrl();
      const actionUrl = base ? `${base}${notice.link}` : notice.link;
      await sendEmail({
        to: recipient.email,
        subject: `${actorName} assigned you a ${ENTITY_LABEL[notice.entityType]} — ${notice.entityName}`,
        react: createElement(AssignmentEmail, {
          recipientName,
          actorName,
          entityLabel: ENTITY_LABEL[notice.entityType],
          entityName: notice.entityName,
          actionUrl,
        }),
      });
    }
  } catch (err) {
    console.error("[notifyAssignment] failed", err);
  }
}

/** Fire several assignment notices concurrently; individual failures are logged. */
export async function notifyAssignments(
  notices: AssignmentNotice[],
): Promise<void> {
  if (notices.length === 0) return;
  const results = await Promise.allSettled(notices.map(notifyAssignment));
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[notifyAssignments] notice failed", r.reason);
    }
  }
}
