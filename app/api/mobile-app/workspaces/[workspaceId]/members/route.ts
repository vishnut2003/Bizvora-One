import User from "@/models/user";
import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { EMPLOYEE_MANAGER_ROLES, type UserRole } from "@/lib/user";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Member directory. Any member can read it (names/roles power the assignee
// pickers, same as the web forms); emails are included only for the roles
// that can access the web team page.
export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const { workspace, role } = await requireMobileWorkspace(req, workspaceId);

    const includeEmail = EMPLOYEE_MANAGER_ROLES.includes(role);

    const memberRole = new Map<string, UserRole>();
    memberRole.set(String(workspace.owner), "owner");
    for (const m of workspace.members ?? []) {
      memberRole.set(String(m.user), m.role);
    }

    const users = await User.find({ _id: { $in: [...memberRole.keys()] } })
      .select("name email image disabled")
      .lean();

    const items = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      ...(includeEmail ? { email: u.email } : {}),
      image: u.image ?? null,
      role: memberRole.get(String(u._id)) ?? "team_member",
      isOwner: String(u._id) === String(workspace.owner),
      disabled: Boolean(u.disabled),
    }));

    items.sort((a, b) => a.name.localeCompare(b.name));

    return ok({ items });
  },
);
