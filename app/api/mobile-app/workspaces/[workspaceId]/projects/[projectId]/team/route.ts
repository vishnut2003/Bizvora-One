import mongoose from "mongoose";
import Project from "@/models/project";
import { canViewAllProjects } from "@/lib/project";
import { notifyAssignments } from "@/lib/notify-assignment";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import { isWorkspaceMember } from "@/lib/services/lead-service";
import { requireProjectManager, requireProjectViewer } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string; projectId: string }> };

export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectViewer(access);
  requireObjectId(projectId);

  const filter: Record<string, unknown> = {
    _id: projectId,
    workspace: workspaceId,
  };
  if (!canViewAllProjects(access.role)) filter.team = access.userId;

  const project = await Project.findOne(filter)
    .select("team")
    .populate("team", "name image")
    .lean();
  if (!project) throw new MobileApiError(404, "project_not_found");

  return ok({ items: serialize(project.team ?? []) });
});

// Replaces the project's team roster (mirrors updateProjectTeam).
export const PUT = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);

  const body = await readJsonBody(req);
  const teamRaw = Array.isArray(body.team)
    ? body.team.filter((v): v is string => typeof v === "string")
    : null;
  if (!teamRaw) {
    throw new MobileApiError(422, "validation_failed", {
      team: "team must be an array of member ids.",
    });
  }
  for (const id of teamRaw) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new MobileApiError(422, "validation_failed", {
        team: "Invalid team member id.",
      });
    }
  }

  const project = await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) throw new MobileApiError(404, "project_not_found");

  const uniqueTeam = Array.from(new Set(teamRaw));
  for (const memberId of uniqueTeam) {
    if (!isWorkspaceMember(access.workspace, memberId)) {
      throw new MobileApiError(422, "validation_failed", {
        team: "Team members must be in this workspace.",
      });
    }
  }

  // Snapshot the prior roster before reassigning so we only notify additions.
  const prevTeam = new Set((project.team ?? []).map((id) => String(id)));

  project.team = uniqueTeam as unknown as typeof project.team;
  await project.save();

  const addedMembers = uniqueTeam.filter((id) => !prevTeam.has(id));
  if (addedMembers.length > 0) {
    await notifyAssignments(
      addedMembers.map((memberId) => ({
        workspaceId,
        workspaceName: access.workspace.name,
        recipientId: memberId,
        actorId: access.userId,
        type: "project_assigned" as const,
        entityType: "project" as const,
        entityId: projectId,
        entityName: project.name,
        link: `/workspace/${workspaceId}/projects/${projectId}`,
      })),
    );
  }

  return ok({ team: uniqueTeam });
});
