import mongoose from "mongoose";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Notification from "@/models/notification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
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

  let id: string | undefined;
  try {
    const parsed = (await request.json()) as { id?: unknown };
    if (typeof parsed?.id === "string") id = parsed.id;
  } catch {
    // No/invalid body → treat as "mark all read".
  }

  await connectDB();

  // Always scope to the caller's own rows in this workspace so a user can never
  // touch someone else's notifications.
  const filter: Record<string, unknown> = {
    workspace: workspaceId,
    recipient: session.user.id,
    read: false,
  };
  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "invalid_id" }, { status: 400 });
    }
    filter._id = id;
  }

  await Notification.updateMany(filter, {
    $set: { read: true, readAt: new Date() },
  });

  return Response.json({ ok: true });
}
