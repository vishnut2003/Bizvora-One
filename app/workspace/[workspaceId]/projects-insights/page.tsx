import type { Metadata } from "next";
import mongoose from "mongoose";
import {
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Gauge,
  Layers,
  LineChart as LineChartIcon,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import Project from "@/models/project";
import Task from "@/models/task";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_DOT_CLASS,
  PROJECT_STATUS_LABEL,
  PROJECT_VIEWER_ROLES,
  canViewAllProjects,
  type ProjectStatus,
} from "@/lib/project";
import {
  TASK_STATUSES,
  TASK_STATUS_DOT_CLASS,
  TASK_STATUS_LABEL,
  type TaskStatus,
} from "@/lib/task";
import DashboardLayout from "@/layouts/dashboard-layout";
import {
  DistributionList,
  SectionCard,
  StatTileCard,
  type StatTile,
} from "../_components/overview-widgets";
import {
  ProjectTasksBarChart,
  TaskActivityLineChart,
  type ActivityPoint,
  type ProjectBar,
} from "./_components/insights-charts";

export const metadata: Metadata = {
  title: "Projects Insights — BizvoraOne",
};

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Number of past months (including the current one) shown in the activity line.
const ACTIVITY_MONTHS = 6;
// Cap on how many projects to render as bars, keeping the chart readable.
const MAX_PROJECT_BARS = 12;

function utcMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export default async function ProjectsInsightsPage({ params }: PageProps) {
  const { workspaceId } = await params;

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  // team_member sees only tasks assigned to them; everyone else sees all.
  const scoped = !canViewAllProjects(role);
  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const meObj = new mongoose.Types.ObjectId(session.user.id);
  // Mongoose does NOT auto-cast inside aggregate() — pass real ObjectIds.
  const taskScopeMatch = scoped ? { assignee: meObj } : {};
  const projectScopeMatch = scoped ? { team: meObj } : {};

  // Overdue boundary: anything due before the start of today (UTC).
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Six UTC month-start buckets, oldest → newest (includes current month).
  const buckets: Date[] = [];
  for (let i = ACTIVITY_MONTHS - 1; i >= 0; i--) {
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() - i;
    while (month < 0) {
      month += 12;
      year -= 1;
    }
    buckets.push(utcMonthStart(year, month));
  }
  const activityFloor = buckets[0];

  const [
    perProjectRaw,
    taskStatusRaw,
    projectStatusRaw,
    createdRaw,
    completedRaw,
    projectDocs,
  ] = await Promise.all([
    // Per-project done / overdue / total (pending derived below).
    Task.aggregate<{
      _id: mongoose.Types.ObjectId;
      total: number;
      done: number;
      overdue: number;
    }>([
      { $match: { workspace: wsObj, ...taskScopeMatch } },
      {
        $group: {
          _id: "$project",
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "done"] },
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", todayStart] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    // Task counts by status (for the distribution list + headline totals).
    Task.aggregate<{ _id: TaskStatus; count: number }>([
      { $match: { workspace: wsObj, ...taskScopeMatch } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Project counts by status.
    Project.aggregate<{ _id: ProjectStatus; count: number }>([
      { $match: { workspace: wsObj, ...projectScopeMatch } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Tasks created per month (activity line).
    Task.aggregate<{ _id: Date; count: number }>([
      {
        $match: {
          workspace: wsObj,
          ...taskScopeMatch,
          createdAt: { $gte: activityFloor },
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$createdAt", unit: "month" } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Tasks completed per month (proxied by updatedAt of done tasks).
    Task.aggregate<{ _id: Date; count: number }>([
      {
        $match: {
          workspace: wsObj,
          ...taskScopeMatch,
          status: "done",
          updatedAt: { $gte: activityFloor },
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$updatedAt", unit: "month" } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Project names for the in-scope projects.
    Project.find({ workspace: workspaceId, ...(scoped ? { team: session.user.id } : {}) })
      .select("name")
      .limit(500)
      .lean() as unknown as Promise<Array<{ _id: { toString(): string }; name: string }>>,
  ]);

  // ---- Headline task counts ----
  const taskCountByStatus: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };
  for (const row of taskStatusRaw) {
    if ((TASK_STATUSES as readonly string[]).includes(row._id)) {
      taskCountByStatus[row._id] = row.count;
    }
  }
  const totalTasks = TASK_STATUSES.reduce(
    (sum, s) => sum + taskCountByStatus[s],
    0,
  );
  const doneTasks = taskCountByStatus.done;
  const overdueTasks = perProjectRaw.reduce((sum, p) => sum + p.overdue, 0);
  const pendingTasks = totalTasks - doneTasks;
  const completionPct = totalTasks
    ? Math.round((doneTasks / totalTasks) * 100)
    : 0;

  // ---- Project bars (only projects with tasks in scope, top by volume) ----
  const nameById = new Map(
    projectDocs.map((p) => [String(p._id), p.name]),
  );
  const projectBars: ProjectBar[] = [...perProjectRaw]
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_PROJECT_BARS)
    .map((p) => {
      const done = p.done;
      const overdue = p.overdue;
      const pending = Math.max(0, p.total - done - overdue);
      return {
        projectName: nameById.get(String(p._id)) ?? "Untitled project",
        done,
        pending,
        overdue,
      };
    });

  // ---- Activity line series ----
  const createdByMonth = new Map<string, number>();
  for (const r of createdRaw) createdByMonth.set(monthKey(new Date(r._id)), r.count);
  const completedByMonth = new Map<string, number>();
  for (const r of completedRaw)
    completedByMonth.set(monthKey(new Date(r._id)), r.count);
  const activity: ActivityPoint[] = buckets.map((b) => ({
    month: MONTHS_SHORT[b.getUTCMonth()],
    created: createdByMonth.get(monthKey(b)) ?? 0,
    completed: completedByMonth.get(monthKey(b)) ?? 0,
  }));

  // ---- Project status distribution ----
  const projectCountByStatus: Record<ProjectStatus, number> = {
    planning: 0,
    active: 0,
    on_hold: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of projectStatusRaw) {
    if ((PROJECT_STATUSES as readonly string[]).includes(row._id)) {
      projectCountByStatus[row._id] = row.count;
    }
  }
  const totalProjects = PROJECT_STATUSES.reduce(
    (sum, s) => sum + projectCountByStatus[s],
    0,
  );

  // DistributionList colors the bar/dot with a tailwind bg-* class; strip the
  // `dark:` variant so only the base color class is passed.
  const taskDistribution = TASK_STATUSES.map((s) => ({
    label: TASK_STATUS_LABEL[s],
    count: taskCountByStatus[s],
    color: TASK_STATUS_DOT_CLASS[s].split(" ")[0],
  }));

  const projectDistribution = PROJECT_STATUSES.map((s) => ({
    label: PROJECT_STATUS_LABEL[s],
    count: projectCountByStatus[s],
    color: PROJECT_STATUS_DOT_CLASS[s].split(" ")[0],
  }));

  const tiles: StatTile[] = [
    {
      label: "Projects",
      value: String(totalProjects),
      icon: FolderKanban,
      accent: "from-indigo-500 to-violet-600",
      href: `/workspace/${workspace.id}/projects`,
    },
    {
      label: "Total tasks",
      value: String(totalTasks),
      icon: Layers,
      accent: "from-sky-500 to-indigo-600",
    },
    {
      label: "Completed",
      value: String(doneTasks),
      icon: CheckCircle2,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: "Pending",
      value: String(pendingTasks),
      icon: ListTodo,
      accent: "from-amber-500 to-orange-600",
    },
    {
      label: "Overdue",
      value: String(overdueTasks),
      icon: AlertTriangle,
      accent: "from-rose-500 to-red-600",
    },
    {
      label: "Completion",
      value: `${completionPct}%`,
      icon: Gauge,
      accent: "from-violet-500 to-fuchsia-600",
      hint: `${doneTasks} of ${totalTasks} tasks done`,
    },
  ];

  const scopedNote = scoped
    ? "Insights are limited to tasks assigned to you."
    : `Across every project in ${workspace.name}.`;

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.07] via-white to-violet-500/[0.06] dark:from-indigo-500/[0.16] dark:via-zinc-900 dark:to-violet-500/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 opacity-50 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <LineChartIcon className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Project Management
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Projects Insights
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  {scopedNote}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Headline stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((tile) => (
            <StatTileCard key={tile.label} tile={tile} />
          ))}
        </div>

        {/* Activity line chart */}
        <SectionCard
          title="Task activity"
          subtitle={`Created vs. completed over the last ${ACTIVITY_MONTHS} months`}
          icon={TrendingUp}
          accent="from-indigo-500 to-violet-600"
        >
          {totalTasks === 0 ? (
            <div className="px-5 py-12 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {scoped
                ? "No tasks are assigned to you yet."
                : "No tasks in this workspace yet."}
            </div>
          ) : (
            <TaskActivityLineChart data={activity} />
          )}
        </SectionCard>

        {/* Per-project bar chart */}
        <SectionCard
          title="Tasks by project"
          subtitle="Completed, pending and overdue tasks per project"
          icon={FolderKanban}
          accent="from-emerald-500 to-teal-600"
        >
          {projectBars.length === 0 ? (
            <div className="px-5 py-12 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {scoped
                ? "No tasks are assigned to you yet."
                : "No tasks to chart yet."}
            </div>
          ) : (
            <ProjectTasksBarChart data={projectBars} />
          )}
        </SectionCard>

        {/* Distributions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Task status breakdown"
            subtitle="All in-scope tasks by status"
            icon={ListTodo}
            accent="from-sky-500 to-indigo-600"
          >
            <DistributionList
              rows={taskDistribution}
              empty={
                scoped
                  ? "No tasks are assigned to you yet."
                  : "No tasks yet."
              }
            />
          </SectionCard>

          <SectionCard
            title="Project status"
            subtitle="Projects grouped by their current status"
            icon={FolderKanban}
            accent="from-violet-500 to-fuchsia-600"
          >
            <DistributionList
              rows={projectDistribution}
              empty={
                scoped ? "You're not on any projects yet." : "No projects yet."
              }
            />
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
