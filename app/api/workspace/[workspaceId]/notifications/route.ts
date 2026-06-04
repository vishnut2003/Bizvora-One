import mongoose from "mongoose";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Notification from "@/models/notification";
import type { NotificationDTO } from "@/lib/notification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIMIT = 20;

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return Response.json({ error: "invalid_workspace" }, { status: 400 });
  }

  await connectDB();

  // Confirm the caller is a member of this workspace before returning anything.
  const member = await Workspace.exists({
    _id: workspaceId,
    $or: [{ owner: session.user.id }, { "members.user": session.user.id }],
  });
  if (!member) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const recipientFilter = {
    workspace: workspaceId,
    recipient: session.user.id,
  };

  const [docs, unreadCount] = await Promise.all([
    Notification.find(recipientFilter)
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean(),
    Notification.countDocuments({ ...recipientFilter, read: false }),
  ]);

  const items: NotificationDTO[] = docs.map((d) => ({
    id: String(d._id),
    type: d.type as NotificationDTO["type"],
    title: d.title,
    body: d.body,
    link: d.link,
    read: Boolean(d.read),
    createdAt: new Date(d.createdAt as Date).toISOString(),
  }));

  return Response.json({ unreadCount, items });
}
