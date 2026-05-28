import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  ListTodo,
} from "lucide-react";
import Project from "@/models/project";
import Task from "@/models/task";
import Milestone from "@/models/milestone";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PROJECT_VIEWER_ROLES } from "@/lib/project";
import ProjectCalendar, {
  type CalendarEvent,
} from "./_components/project-calendar";

export const metadata: Metadata = {
  title: "Project Overview — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

type LeanTask = {
  _id: { toString(): string };
  title: string;
  status: string;
  dueDate: Date | null;
};

type LeanMilestone = {
  _id: { toString(): string };
  title: string;
  status: string;
  dueDate: Date | null;
};

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ProjectOverviewPage({ params }: Props) {
  const { workspaceId, projectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();

  await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const project = await Project.exists({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) notFound();

  const [tasksRaw, milestonesRaw] = await Promise.all([
    Task.find({ project: projectId, workspace: workspaceId })
      .select("title status dueDate")
      .limit(1000)
      .lean() as unknown as Promise<LeanTask[]>,
    Milestone.find({ project: projectId, workspace: workspaceId })
      .select("title status dueDate")
      .lean() as unknown as Promise<LeanMilestone[]>,
  ]);

  const todayKey = toKey(new Date());

  const events: CalendarEvent[] = [];
  for (const t of tasksRaw) {
    if (t.dueDate) {
      events.push({
        id: String(t._id),
        type: "task",
        title: t.title,
        date: toKey(t.dueDate),
        status: t.status,
      });
    }
  }
  for (const m of milestonesRaw) {
    if (m.dueDate) {
      events.push({
        id: String(m._id),
        type: "milestone",
        title: m.title,
        date: toKey(m.dueDate),
        status: m.status,
      });
    }
  }

  const taskTotal = tasksRaw.length;
  const taskDone = tasksRaw.filter((t) => t.status === "done").length;
  const overdueTasks = tasksRaw.filter(
    (t) => t.dueDate && t.status !== "done" && toKey(t.dueDate) < todayKey,
  ).length;
  const milestoneTotal = milestonesRaw.length;
  const milestoneDone = milestonesRaw.filter(
    (m) => m.status === "completed",
  ).length;

  const stats: Array<{
    label: string;
    value: string;
    sub?: string;
    icon: typeof ListTodo;
    accent: string;
  }> = [
    {
      label: "Tasks",
      value: String(taskTotal),
      sub: taskTotal > 0 ? `${taskDone} done` : undefined,
      icon: ListTodo,
      accent: "from-amber-500 to-orange-600",
    },
    {
      label: "Completed",
      value: taskTotal > 0 ? `${Math.round((taskDone / taskTotal) * 100)}%` : "—",
      sub: taskTotal > 0 ? `${taskDone}/${taskTotal} tasks` : undefined,
      icon: CheckCircle2,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: "Milestones",
      value: String(milestoneTotal),
      sub: milestoneTotal > 0 ? `${milestoneDone} completed` : undefined,
      icon: Flag,
      accent: "from-violet-500 to-fuchsia-600",
    },
    {
      label: "Overdue",
      value: String(overdueTasks),
      sub: overdueTasks > 0 ? "tasks past due" : "on track",
      icon: AlertTriangle,
      accent: "from-rose-500 to-red-600",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${stat.accent}`}
              />
              <div className="relative flex items-start justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
                <span
                  className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${stat.accent}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="relative mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                {stat.value}
              </p>
              {stat.sub ? (
                <p className="relative mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.sub}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <ProjectCalendar
        workspaceId={workspaceId}
        projectId={projectId}
        events={events}
        todayKey={todayKey}
      />
    </div>
  );
}
