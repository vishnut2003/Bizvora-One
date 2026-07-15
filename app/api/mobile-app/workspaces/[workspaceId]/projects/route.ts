import mongoose, { type FilterQuery } from "mongoose";
import Project, { type IProject } from "@/models/project";
import Customer from "@/models/customer";
import {
  PROJECT_STATUSES,
  canViewAllProjects,
  type ProjectStatus,
} from "@/lib/project";
import { escapeRegex } from "@/lib/voucher";
import { notifyAssignments } from "@/lib/notify-assignment";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  listEnvelope,
  ok,
  parsePagination,
  parseSort,
  readJsonBody,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import { isWorkspaceMember } from "@/lib/services/lead-service";
import {
  parseProjectBody,
  requireProjectManager,
  requireProjectViewer,
} from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORT_FIELDS = ["createdAt", "updatedAt", "name", "endDate"] as const;

export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const access = await requireMobileWorkspace(req, workspaceId);
    requireProjectViewer(access);

    const url = new URL(req.url);
    const pagination = parsePagination(url);
    const sort = parseSort(url, SORT_FIELDS, { updatedAt: -1 });

    // Team members only see projects whose team includes them.
    const filter: FilterQuery<IProject> = canViewAllProjects(access.role)
      ? { workspace: workspaceId }
      : { workspace: workspaceId, team: access.userId };

    const status = url.searchParams.get("status") ?? "";
    if ((PROJECT_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as ProjectStatus;
    }

    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length > 0) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: re }, { description: re }];
    }

    const [docs, total] = await Promise.all([
      Project.find(filter)
        .populate("client", "name company")
        .populate("team", "name image")
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    return ok(listEnvelope(docs, pagination, total));
  },
);

export const POST = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const access = await requireMobileWorkspace(req, workspaceId);
    requireProjectManager(access);

    const body = await readJsonBody(req);
    const parsed = parseProjectBody(body);
    if (parsed.errors) {
      throw new MobileApiError(422, "validation_failed", parsed.errors);
    }
    const data = parsed.data!;

    const teamRaw = Array.isArray(body.team)
      ? body.team.filter((v): v is string => typeof v === "string")
      : [];
    for (const id of teamRaw) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new MobileApiError(422, "validation_failed", {
          team: "Invalid team member id.",
        });
      }
    }

    if (data.client) {
      const exists = await Customer.exists({
        _id: data.client,
        workspace: workspaceId,
      });
      if (!exists) {
        throw new MobileApiError(422, "validation_failed", {
          client: "Client isn't in this workspace.",
        });
      }
    }

    const uniqueTeam = Array.from(new Set(teamRaw));
    for (const memberId of uniqueTeam) {
      if (!isWorkspaceMember(access.workspace, memberId)) {
        throw new MobileApiError(422, "validation_failed", {
          team: "Team members must be in this workspace.",
        });
      }
    }

    const project = await Project.create({
      workspace: workspaceId,
      name: data.name,
      description: data.description,
      client: data.client || null,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      team: uniqueTeam,
      createdBy: access.userId,
    });

    // Record the link on the customer's activity timeline. Best-effort — a
    // failure here shouldn't roll back the already-created project.
    if (data.client) {
      try {
        await Customer.updateOne(
          { _id: data.client, workspace: workspaceId },
          {
            $push: {
              activity: {
                type: "project_linked",
                actor: new mongoose.Types.ObjectId(access.userId),
                at: new Date(),
                data: {
                  projectId: project._id,
                  projectName: data.name,
                  projectStatus: data.status,
                },
              },
            },
          },
        );
      } catch (err) {
        console.error("[mobile projects] customer activity failed", err);
      }
    }

    // Notify each initial team member. Best-effort.
    if (uniqueTeam.length > 0) {
      await notifyAssignments(
        uniqueTeam.map((memberId) => ({
          workspaceId,
          workspaceName: access.workspace.name,
          recipientId: memberId,
          actorId: access.userId,
          type: "project_assigned" as const,
          entityType: "project" as const,
          entityId: String(project._id),
          entityName: data.name,
          link: `/workspace/${workspaceId}/projects/${String(project._id)}`,
        })),
      );
    }

    return ok({ project: serialize(project.toObject()) }, 201);
  },
);
