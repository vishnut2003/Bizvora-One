import {
  AlertOctagon,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Flag,
  FolderKanban,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import mongoose, { type FilterQuery } from "mongoose";
import Project, { type IProject } from "@/models/project";
import Task from "@/models/task";
import Milestone from "@/models/milestone";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_DOT_CLASS,
  PROJECT_STATUS_LABEL,
} from "@/lib/project";
import {
  TASK_STATUSES,
  TASK_STATUS_DOT_CLASS,
  TASK_STATUS_LABEL,
} from "@/lib/task";
import { timeAgo } from "@/lib/time";
import {
  DistributionList,
  EmptyRow,
  SectionCard,
  type StatTile,
} from "./overview-widgets";
import { SecondaryStatStrip, StatGrid } from "./executive-overview";

export default async function ProjectsOverview({
  workspaceId,
  userId,
  mineOnly,
}: {
  workspaceId: string;
  userId: string;
  mineOnly: boolean;
}) {
  const wsObj = new mongoose.Types.ObjectId(workspaceId);
  const userObj = new mongoose.Types.ObjectId(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  // Team-member projects = team contains userId.
  const baseProjectFilter: FilterQuery<IProject> = mineOnly
    ? { workspace: workspaceId, team: userObj }
    : { workspace: workspaceId };

  // Tasks scoped: mineOnly → assignee = me; else all workspace tasks.
  const baseTaskFilter: Record<string, unknown> = mineOnly
    ? { workspace: workspaceId, assignee: userId }
    : { workspace: workspaceId };

  const baseTaskAgg: Record<string, unknown> = mineOnly
    ? { workspace: wsObj, assignee: userObj }
    : { workspace: wsObj };

  const [
    projectStatusAgg,
    activeProjects,
    taskStatusAgg,
    openTaskCount,
    overdueTaskCount,
    dueThisWeekCount,
    completedThisWeekCount,
    myOpenTasks,
    upcomingMilestones,
  ] = await Promise.all([
    Project.aggregate<{ _id: string; count: number }>([
      { $match: mineOnly ? { workspace: wsObj, team: userObj } : { workspace: wsObj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Project.find({
      ...baseProjectFilter,
      status: { $in: ["planning", "active"] },
    })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select({ name: 1, status: 1, startDate: 1, endDate: 1, team: 1 })
      .lean(),
    Task.aggregate<{ _id: string; count: number }>([
      { $match: baseTaskAgg },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      ...baseTaskFilter,
      status: { $in: ["todo", "in_progress", "in_review"] },
    }),
    Task.countDocuments({
      ...baseTaskFilter,
      status: { $in: ["todo", "in_progress", "in_review"] },
      dueDate: { $lt: today },
    }),
    Task.countDocuments({
      ...baseTaskFilter,
      status: { $in: ["todo", "in_progress", "in_review"] },
      dueDate: { $gte: today, $lte: inSevenDays },
    }),
    Task.countDocuments({
      ...baseTaskFilter,
      status: "done",
      updatedAt: {
        $gte: (() => {
          const d = new Date(today);
          d.setDate(d.getDate() - 7);
          return d;
        })(),
      },
    }),
    Task.find({
      ...baseTaskFilter,
      status: { $in: ["todo", "in_progress", "in_review"] },
    })
      .sort({ dueDate: 1, priority: -1 })
      .limit(6)
      .select({ title: 1, status: 1, priority: 1, dueDate: 1, project: 1 })
      .populate({ path: "project", select: "name", model: Project })
      .lean(),
    Milestone.find({
      workspace: workspaceId,
      status: "open",
      dueDate: { $gte: today },
    })
      .sort({ dueDate: 1 })
      .limit(6)
      .select({ title: 1, dueDate: 1, project: 1 })
      .populate({ path: "project", select: "name", model: Project })
      .lean(),
  ]);

  const projectStatusMap = new Map(
    projectStatusAgg.map((r) => [r._id, r.count] as const),
  );
  const taskStatusMap = new Map(
    taskStatusAgg.map((r) => [r._id, r.count] as const),
  );

  const activeProjectCount =
    (projectStatusMap.get("planning") ?? 0) +
    (projectStatusMap.get("active") ?? 0);

  const tiles: StatTile[] = [
    {
      label: mineOnly ? "My projects" : "Active projects",
      value: String(activeProjectCount),
      hint: mineOnly ? "On your team" : "Planning + active",
      icon: FolderKanban,
      accent: "from-indigo-500 to-violet-700",
      href: `/workspace/${workspaceId}/projects`,
    },
    {
      label: mineOnly ? "My open tasks" : "Open tasks",
      value: String(openTaskCount),
      hint: `${dueThisWeekCount} due this week`,
      icon: ListTodo,
      accent: "from-blue-500 to-indigo-700",
    },
    {
      label: "Overdue tasks",
      value: String(overdueTaskCount),
      hint: overdueTaskCount === 0 ? "On time" : "Past their due date",
      icon: AlertOctagon,
      accent: "from-rose-500 to-red-600",
    },
    {
      label: "Done this week",
      value: String(completedThisWeekCount),
      hint: "Last 7 days",
      icon: CheckCircle2,
      accent: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <>
      <StatGrid tiles={tiles} />

      <SecondaryStatStrip
        items={TASK_STATUSES.map((s) => ({
          label: TASK_STATUS_LABEL[s],
          value: String(taskStatusMap.get(s) ?? 0),
          icon: ListTodo,
        }))}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            icon={ListTodo}
            title={mineOnly ? "Your open tasks" : "Open tasks across projects"}
            subtitle="Sorted by due date, then priority"
            accent="from-primary to-secondary"
          >
            {myOpenTasks.length === 0 ? (
              <EmptyRow>Nothing on your plate — enjoy the calm.</EmptyRow>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(
                  myOpenTasks as unknown as Array<{
                    _id: { toString(): string };
                    title: string;
                    status: string;
                    priority: string;
                    dueDate: Date | null;
                    project: { _id: { toString(): string }; name: string } | null;
                  }>
                ).map((t) => {
                  const due = t.dueDate ? new Date(t.dueDate) : null;
                  const overdue = due && due < today;
                  return (
                    <li
                      key={t._id.toString()}
                      className="flex items-start gap-3 px-5 py-3 text-[13px]"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TASK_STATUS_DOT_CLASS[t.status as keyof typeof TASK_STATUS_DOT_CLASS] ?? "bg-zinc-400"}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {t.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {t.project?.name ?? "—"} ·{" "}
                          {TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL] ?? t.status}
                          {due ? (
                            <span
                              className={
                                overdue
                                  ? " text-rose-600 dark:text-rose-400"
                                  : ""
                              }
                            >
                              {" "}
                              · due {format(due, "MMM d")}
                              {overdue ? " (overdue)" : ""}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {t.project ? (
                        <Link
                          href={`/workspace/${workspaceId}/projects/${t.project._id.toString()}/tasks`}
                          className="shrink-0 text-[11.5px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          open →
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            icon={FolderKanban}
            title="Project status"
            subtitle={
              mineOnly
                ? "Projects you're on"
                : "All projects in this workspace"
            }
            accent="from-indigo-500 to-violet-700"
            actionLabel="Open projects"
            actionHref={`/workspace/${workspaceId}/projects`}
          >
            <DistributionList
              rows={PROJECT_STATUSES.map((s) => ({
                label: PROJECT_STATUS_LABEL[s],
                count: projectStatusMap.get(s) ?? 0,
                color: PROJECT_STATUS_DOT_CLASS[s],
              }))}
              empty="No projects yet."
            />
          </SectionCard>

          <SectionCard
            icon={Clock}
            title="Upcoming milestones"
            subtitle="Next 6 due"
            accent="from-amber-500 to-orange-600"
          >
            {upcomingMilestones.length === 0 ? (
              <EmptyRow>No upcoming milestones.</EmptyRow>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(
                  upcomingMilestones as unknown as Array<{
                    _id: { toString(): string };
                    title: string;
                    dueDate: Date | null;
                    project: { _id: { toString(): string }; name: string } | null;
                  }>
                ).map((m) => (
                  <li
                    key={m._id.toString()}
                    className="flex items-start gap-3 px-5 py-3 text-[13px]"
                  >
                    <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {m.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {m.project?.name ?? "—"}
                        {m.dueDate ? (
                          <>
                            {" "}
                            · {format(new Date(m.dueDate), "MMM d, yyyy")}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard
        icon={CalendarCheck}
        title={mineOnly ? "Your active projects" : "Active projects"}
        subtitle="Planning or in flight"
        accent="from-emerald-500 to-teal-600"
        actionLabel="Open projects"
        actionHref={`/workspace/${workspaceId}/projects`}
      >
        {activeProjects.length === 0 ? (
          <EmptyRow>No active projects.</EmptyRow>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(
              activeProjects as unknown as Array<{
                _id: { toString(): string };
                name: string;
                status: string;
                startDate: Date | null;
                endDate: Date | null;
                team: unknown[];
              }>
            ).map((p) => (
              <li
                key={p._id.toString()}
                className="flex items-start gap-3 px-5 py-3 text-[13px]"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PROJECT_STATUS_DOT_CLASS[p.status as keyof typeof PROJECT_STATUS_DOT_CLASS] ?? "bg-zinc-400"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/workspace/${workspaceId}/projects/${p._id.toString()}`}
                    className="block truncate font-medium text-zinc-900 hover:text-primary dark:text-zinc-100"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? p.status}
                    {p.endDate ? (
                      <>
                        {" "}
                        · ends {format(new Date(p.endDate), "MMM d, yyyy")} (
                        {timeAgo(new Date(p.endDate))})
                      </>
                    ) : null}
                    {" "}· {p.team?.length ?? 0} member
                    {(p.team?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
