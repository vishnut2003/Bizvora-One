import mongoose from "mongoose";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Feedback from "@/models/feedback";
import { isFeedbackCategory, FEEDBACK_MESSAGE_MAX } from "@/lib/feedback";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { category, message } = (body ?? {}) as {
    category?: unknown;
    message?: unknown;
  };

  if (!isFeedbackCategory(category)) {
    return Response.json({ error: "invalid_category" }, { status: 400 });
  }

  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed || trimmed.length > FEEDBACK_MESSAGE_MAX) {
    return Response.json({ error: "invalid_message" }, { status: 400 });
  }

  await connectDB();

  // Confirm the caller is a member of this workspace before accepting feedback.
  const member = await Workspace.exists({
    _id: workspaceId,
    $or: [{ owner: session.user.id }, { "members.user": session.user.id }],
  });
  if (!member) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  await Feedback.create({
    workspace: workspaceId,
    author: session.user.id,
    authorName: session.user.name ?? "",
    authorEmail: session.user.email ?? "",
    category,
    message: trimmed,
  });

  return Response.json({ ok: true }, { status: 201 });
}
