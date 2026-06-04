import "server-only";
import { createElement } from "react";
import { connectDB } from "@/config/db";
import User from "@/models/user";
import { sendEmail } from "@/lib/email";
import { getPublicBaseUrl } from "@/lib/integration";
import { ROLE_LABEL, type UserRole } from "@/lib/user";
import WorkspaceAddedEmail from "@/emails/workspace-added-email";

export type WorkspaceAddedNotice = {
  workspaceId: string;
  workspaceName: string;
  recipientId: string; // the new member's User _id (carried for symmetry)
  recipientEmail: string;
  recipientName: string;
  actorId: string; // session.user.id
  role: UserRole;
};

/**
 * Email a user to let them know they were added to a workspace. Best-effort:
 * never throws — failures are logged so the calling action's primary work
 * (adding the member) is never rolled back.
 */
export async function notifyWorkspaceAdded(
  notice: WorkspaceAddedNotice,
): Promise<void> {
  try {
    if (!notice.recipientEmail) return;

    await connectDB();

    const actor = await User.findById(notice.actorId).select("name").lean();
    const actorName = actor?.name?.trim() || "Someone";
    const recipientName = notice.recipientName?.trim() || "there";
    const roleLabel = ROLE_LABEL[notice.role] ?? notice.role;

    const base = getPublicBaseUrl();
    const link = `/workspace/${notice.workspaceId}`;
    const actionUrl = base ? `${base}${link}` : link;

    await sendEmail({
      to: notice.recipientEmail,
      subject: `${actorName} added you to ${notice.workspaceName} on BizvoraOne`,
      react: createElement(WorkspaceAddedEmail, {
        recipientName,
        actorName,
        workspaceName: notice.workspaceName,
        roleLabel,
        actionUrl,
      }),
    });
  } catch (err) {
    console.error("[notifyWorkspaceAdded] failed", err);
  }
}
