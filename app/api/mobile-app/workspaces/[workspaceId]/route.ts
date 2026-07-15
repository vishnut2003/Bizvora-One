import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const { userId, workspace, role } = await requireMobileWorkspace(
      req,
      workspaceId,
    );

    return ok({
      workspace: {
        id: String(workspace._id),
        name: workspace.name,
        description: workspace.description ?? "",
        color: workspace.color,
        status: workspace.status ?? "active",
        myRole: role,
        isOwner: String(workspace.owner) === userId,
        memberCount: (workspace.members?.length ?? 0) + 1,
        maxMembers: workspace.maxMembers ?? null,
        createdAt: workspace.createdAt.toISOString(),
      },
    });
  },
);
