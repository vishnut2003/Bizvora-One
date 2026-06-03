import "server-only";
import User from "@/models/user";
import type { LinkableUser } from "../_components/linked-user-picker";

type WorkspaceLike = {
  owner: unknown;
  members?: { user: unknown }[];
};

// Workspace users (owner + members) that an employee can optionally be linked
// to. Read on the server and passed to the form so the client never queries
// the database directly.
export async function getLinkCandidates(
  workspace: WorkspaceLike,
): Promise<LinkableUser[]> {
  const ids = Array.from(
    new Set([
      String(workspace.owner),
      ...(workspace.members ?? []).map((m) => String(m.user)),
    ]),
  );

  const users = await User.find({ _id: { $in: ids } })
    .select("name email image")
    .lean();

  return users.map((u) => ({
    id: String(u._id),
    name: u.name ?? "",
    email: u.email,
    image: u.image ?? null,
  }));
}
