import Workspace from "@/models/workspace";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getActorRole, type LeanWorkspace } from "@/lib/workspace-access";
import { isWorkspaceAccessible } from "@/lib/workspace";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mirrors the web workspace picker: every workspace the user belongs to is
// returned, including non-active ones (flagged via status/accessible) so the
// app can show pending/suspended states.
export const GET = withMobile(async (req) => {
  const { userId } = await requireMobileUser(req);

  const docs = (await Workspace.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .sort({ createdAt: -1 })
    .lean()) as LeanWorkspace[];

  const items = docs.map((ws) => ({
    id: String(ws._id),
    name: ws.name,
    description: ws.description ?? "",
    color: ws.color,
    status: ws.status ?? "active",
    accessible: isWorkspaceAccessible(ws.status),
    myRole: getActorRole(ws, userId),
    isOwner: String(ws.owner) === userId,
    memberCount: (ws.members?.length ?? 0) + 1,
    createdAt: ws.createdAt.toISOString(),
  }));

  return ok({ items });
});
