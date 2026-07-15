import mongoose from "mongoose";
import Notification from "@/models/notification";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const { userId } = await requireMobileWorkspace(req, workspaceId);

    // No/invalid body → mark all read (mirrors the web endpoint).
    let ids: string[] | undefined;
    try {
      const body = (await req.json()) as { id?: unknown; ids?: unknown };
      if (typeof body?.id === "string") ids = [body.id];
      else if (Array.isArray(body?.ids)) {
        ids = body.ids.filter((v): v is string => typeof v === "string");
      }
    } catch {
      // fall through
    }

    // Always scoped to the caller's own rows so a user can never touch
    // someone else's notifications.
    const filter: Record<string, unknown> = {
      workspace: workspaceId,
      recipient: userId,
      read: false,
    };
    if (ids) {
      if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        throw new MobileApiError(400, "invalid_id");
      }
      filter._id = { $in: ids };
    }

    await Notification.updateMany(filter, {
      $set: { read: true, readAt: new Date() },
    });

    return ok();
  },
);
