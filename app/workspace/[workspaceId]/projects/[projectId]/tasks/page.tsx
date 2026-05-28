import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { ListTodo } from "lucide-react";
import Project from "@/models/project";
import Task, { type ITask } from "@/models/task";
import Milestone from "@/models/milestone";
import User from "@/models/user";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PROJECT_VIEWER_ROLES, canManageProjects } from "@/lib/project";
import type { TaskPriority, TaskStatus } from "@/lib/task";
import TasksBoard, {
  type BoardMember,
  type BoardMilestone,
  type BoardTask,
} from "./_components/tasks-board";

export const metadata: Metadata = {
  title: "Project Tasks — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

type LeanTask = Omit<ITask, "assignee" | "milestone"> & {
  _id: { toString(): string };
  assignee: { toString(): string } | null;
  milestone: { toString(): string } | null;
  createdBy: { toString(): string };
  dueDate: Date | null;
};

type LeanMilestone = { _id: { toString(): string }; title: string };

type LeanUser = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  image?: string | null;
};

function toDateInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function ProjectTasksPage({ params }: Props) {
  const { workspaceId, projectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const project = await Project.exists({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) notFound();

  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];

  const [tasksRaw, milestonesRaw, usersRaw] = await Promise.all([
    Task.find({ project: projectId, workspace: workspaceId })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean() as unknown as Promise<LeanTask[]>,
    Milestone.find({ project: projectId, workspace: workspaceId })
      .select("title")
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<LeanMilestone[]>,
    User.find({ _id: { $in: memberIds } })
      .select("name email image")
      .lean() as unknown as Promise<LeanUser[]>,
  ]);

  const members: BoardMember[] = usersRaw.map((u) => ({
    id: String(u._id),
    name: u.name ?? u.email ?? "Member",
    email: u.email ?? "",
    image: u.image ?? null,
  }));

  const milestones: BoardMilestone[] = milestonesRaw.map((m) => ({
    id: String(m._id),
    title: m.title,
  }));

  const todayStr = new Date().toISOString().slice(0, 10);

  const tasks: BoardTask[] = tasksRaw.map((t) => {
    const dueDate = toDateInput(t.dueDate);
    return {
      id: String(t._id),
      title: t.title,
      description: t.description ?? "",
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      assigneeId: t.assignee ? String(t.assignee) : "",
      dueDate,
      overdue: dueDate !== null && t.status !== "done" && dueDate < todayStr,
      milestoneId: t.milestone ? String(t.milestone) : "",
      createdById: String(t.createdBy),
    };
  });

  const canManage = canManageProjects(role);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
          <ListTodo className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            Tasks
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            {tasks.length === 0
              ? "Break the project into tasks and track them to done."
              : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
          </p>
        </div>
      </div>

      <TasksBoard
        workspaceId={workspaceId}
        projectId={projectId}
        tasks={tasks}
        members={members}
        milestones={milestones}
        canManage={canManage}
        currentUserId={session.user.id}
      />
    </div>
  );
}
