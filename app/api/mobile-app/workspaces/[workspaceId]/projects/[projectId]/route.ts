import mongoose from "mongoose";
import Project from "@/models/project";
import Customer from "@/models/customer";
import Task from "@/models/task";
import Milestone from "@/models/milestone";
import { canViewAllProjects } from "@/lib/project";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import {
  ok,
  readJsonBody,
  requireObjectId,
  serialize,
  withMobile,
} from "@/lib/mobile-api";
import {
  parseProjectBody,
  requireProjectManager,
  requireProjectViewer,
} from "../_shared";

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
    .populate("client", "name company email")
    .populate("team", "name image")
    .populate("createdBy", "name image")
    .lean();
  if (!project) throw new MobileApiError(404, "project_not_found");

  const [taskCounts, milestoneCounts] = await Promise.all([
    Task.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          workspace: new mongoose.Types.ObjectId(workspaceId),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Milestone.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          workspace: new mongoose.Types.ObjectId(workspaceId),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  return ok({
    project: serialize(project),
    taskCounts: Object.fromEntries(taskCounts.map((t) => [t._id, t.count])),
    milestoneCounts: Object.fromEntries(
      milestoneCounts.map((m) => [m._id, m.count]),
    ),
  });
});

// Updates project details (not the team roster — see /team). Provided fields
// are merged over current values, mirroring updateProject's semantics.
export const PATCH = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId, projectId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireProjectManager(access);
  requireObjectId(projectId);

  const body = await readJsonBody(req);

  const project = await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) throw new MobileApiError(404, "project_not_found");

  const merged: Record<string, unknown> = {
    name: project.name,
    description: project.description ?? "",
    client: project.client ? String(project.client) : "",
    status: project.status,
    startDate: project.startDate
      ? new Date(project.startDate).toISOString()
      : "",
    endDate: project.endDate ? new Date(project.endDate).toISOString() : "",
    ...body,
  };
  const parsed = parseProjectBody(merged);
  if (parsed.errors) {
    throw new MobileApiError(422, "validation_failed", parsed.errors);
  }
  const data = parsed.data!;

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

  const previousClient = project.client ? String(project.client) : "";
  const clientChanged = previousClient !== data.client;

  project.name = data.name;
  project.description = data.description;
  project.client = data.client
    ? (new mongoose.Types.ObjectId(data.client) as typeof project.client)
    : null;
  project.status = data.status;
  project.startDate = data.startDate;
  project.endDate = data.endDate;

  await project.save();

  // When newly linked to a customer, log it on their timeline. Best-effort.
  if (clientChanged && data.client) {
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

  return ok({ project: serialize(project.toObject()) });
});
