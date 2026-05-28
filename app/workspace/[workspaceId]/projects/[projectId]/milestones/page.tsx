import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Flag } from "lucide-react";
import Project from "@/models/project";
import Milestone, { type IMilestone } from "@/models/milestone";
import Task from "@/models/task";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PROJECT_VIEWER_ROLES, canManageProjects } from "@/lib/project";
import type { MilestoneStatus } from "@/lib/milestone";
import MilestonesList, {
  type ListMilestone,
} from "./_components/milestones-list";

export const metadata: Metadata = {
  title: "Project Milestones — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

type LeanMilestone = Omit<IMilestone, never> & {
  _id: { toString(): string };
  dueDate: Date | null;
};

function toDateInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function ProjectMilestonesPage({ params }: Props) {
  const { workspaceId, projectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();

  const { role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const project = await Project.exists({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) notFound();

  const [milestonesRaw, taskAgg] = await Promise.all([
    Milestone.find({ project: projectId, workspace: workspaceId })
      .sort({ status: 1, dueDate: 1, createdAt: -1 })
      .lean() as unknown as Promise<LeanMilestone[]>,
    Task.aggregate<{ _id: mongoose.Types.ObjectId; total: number; done: number }>([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          workspace: new mongoose.Types.ObjectId(workspaceId),
          milestone: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$milestone",
          total: { $sum: 1 },
          done: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const counts = new Map<string, { total: number; done: number }>();
  for (const row of taskAgg) {
    counts.set(String(row._id), { total: row.total, done: row.done });
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const milestones: ListMilestone[] = milestonesRaw.map((m) => {
    const c = counts.get(String(m._id)) ?? { total: 0, done: 0 };
    const dueDate = toDateInput(m.dueDate);
    return {
      id: String(m._id),
      title: m.title,
      description: m.description ?? "",
      dueDate,
      overdue:
        dueDate !== null && m.status !== "completed" && dueDate < todayStr,
      status: m.status as MilestoneStatus,
      taskTotal: c.total,
      taskDone: c.done,
    };
  });

  const canManage = canManageProjects(role);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
          <Flag className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            Milestones
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            {milestones.length === 0
              ? "Plan key dates and track progress from linked tasks."
              : `${milestones.length} ${
                  milestones.length === 1 ? "milestone" : "milestones"
                }`}
          </p>
        </div>
      </div>

      <MilestonesList
        workspaceId={workspaceId}
        projectId={projectId}
        milestones={milestones}
        canManage={canManage}
      />
    </div>
  );
}
