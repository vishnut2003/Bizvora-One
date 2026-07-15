import Notification from "@/models/notification";
import type { NotificationDTO } from "@/lib/notification";
import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { listEnvelope, ok, parsePagination, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const { userId } = await requireMobileWorkspace(req, workspaceId);

    const url = new URL(req.url);
    const pagination = parsePagination(url);
    const unreadOnly = url.searchParams.get("unread") === "true";

    const filter: Record<string, unknown> = {
      workspace: workspaceId,
      recipient: userId,
    };
    if (unreadOnly) filter.read = false;

    const [docs, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        workspace: workspaceId,
        recipient: userId,
        read: false,
      }),
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

    return ok({ ...listEnvelope(items, pagination, total), unreadCount });
  },
);
