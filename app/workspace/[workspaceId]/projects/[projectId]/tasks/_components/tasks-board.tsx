"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarClock,
  Eye,
  Flag,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/button";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import DatePicker from "@/components/date-picker";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_BADGE_CLASS,
  TASK_PRIORITY_DOT_CLASS,
  TASK_PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_DOT_CLASS,
  TASK_STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task";
import {
  createTask,
  deleteTask,
  setTaskStatus,
  updateTask,
  type TaskActionState,
} from "../actions";

export type BoardTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string | null;
  overdue: boolean;
  milestoneId: string;
  createdById: string;
};

export type BoardMember = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type BoardMilestone = { id: string; title: string };

const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function TasksBoard({
  workspaceId,
  projectId,
  tasks,
  members,
  milestones,
  canManage,
  currentUserId,
}: {
  workspaceId: string;
  projectId: string;
  tasks: BoardTask[];
  members: BoardMember[];
  milestones: BoardMilestone[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [deleting, setDeleting] = useState<BoardTask | null>(null);
  const [viewing, setViewing] = useState<BoardTask | null>(null);
  const [mineOnly, setMineOnly] = useState(false);

  const mineCount = useMemo(
    () => tasks.filter((t) => t.assigneeId === currentUserId).length,
    [tasks, currentUserId],
  );
  const visibleTasks = mineOnly
    ? tasks.filter((t) => t.assigneeId === currentUserId)
    : tasks;

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m]));
    return (id: string) => map.get(id) ?? null;
  }, [members]);

  const milestoneTitle = useMemo(() => {
    const map = new Map(milestones.map((m) => [m.id, m.title]));
    return (id: string) => map.get(id) ?? "";
  }, [milestones]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(task: BoardTask) {
    setEditing(task);
    setFormOpen(true);
  }

  const columns = TASK_STATUSES.map((status) => ({
    status,
    items: visibleTasks.filter((t) => t.status === status),
  }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
          My tasks only
          <span className="rounded-full bg-zinc-100 px-1.5 text-[10.5px] font-medium tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {mineCount}
          </span>
        </label>
        {canManage ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <div
            key={col.status}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="mb-2.5 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    TASK_STATUS_DOT_CLASS[col.status],
                  )}
                />
                <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">
                  {TASK_STATUS_LABEL[col.status]}
                </span>
              </div>
              <span className="rounded-full bg-white px-1.5 text-[10.5px] font-medium tabular-nums text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
                {col.items.length}
              </span>
            </div>

            <div className="space-y-2">
              {col.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-[11.5px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                  Nothing here
                </p>
              ) : (
                col.items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={
                      task.assigneeId ? memberName(task.assigneeId) : null
                    }
                    milestoneTitle={
                      task.milestoneId ? milestoneTitle(task.milestoneId) : ""
                    }
                    canEditDetails={canManage}
                    canChangeStatus={
                      canManage ||
                      (task.assigneeId === currentUserId &&
                        task.status !== "done")
                    }
                    canSetDone={canManage}
                    canDelete={canManage}
                    onView={() => setViewing(task)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleting(task)}
                    onStatusChange={(status) => {
                      void (async () => {
                        await setTaskStatus(
                          workspaceId,
                          projectId,
                          task.id,
                          status,
                        );
                        router.refresh();
                      })();
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskFormPopup
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        workspaceId={workspaceId}
        projectId={projectId}
        task={editing}
        members={members}
        milestones={milestones}
        canSetDone={canManage}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />

      <DeleteTaskDialog
        task={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        workspaceId={workspaceId}
        projectId={projectId}
        onDeleted={() => {
          setDeleting(null);
          router.refresh();
        }}
      />

      <TaskDetailsPopup
        task={viewing}
        assignee={viewing?.assigneeId ? memberName(viewing.assigneeId) : null}
        milestoneTitle={
          viewing?.milestoneId ? milestoneTitle(viewing.milestoneId) : ""
        }
        createdByName={
          viewing ? (memberName(viewing.createdById)?.name ?? "") : ""
        }
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />
    </>
  );
}

function TaskCard({
  task,
  assignee,
  milestoneTitle,
  canEditDetails,
  canChangeStatus,
  canSetDone,
  canDelete,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: BoardTask;
  assignee: BoardMember | null;
  milestoneTitle: string;
  canEditDetails: boolean;
  canChangeStatus: boolean;
  canSetDone: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;
  const overdue = task.overdue;
  // Team members can move a task toward review but not mark it done.
  const statusOptions = canSetDone
    ? TASK_STATUSES
    : TASK_STATUSES.filter((s) => s !== "done");

  return (
    <div className="group rounded-lg border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-100/50 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">
          {task.title}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onView}
            aria-label="View task"
            className="grid h-6 w-6 place-items-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {canEditDetails || canDelete ? (
            <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {canEditDetails ? (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Edit task"
                  className="grid h-6 w-6 place-items-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete task"
                  className="grid h-6 w-6 place-items-center rounded text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>

      {task.description ? (
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {task.description}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
            TASK_PRIORITY_BADGE_CLASS[task.priority],
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              TASK_PRIORITY_DOT_CLASS[task.priority],
            )}
          />
          {TASK_PRIORITY_LABEL[task.priority]}
        </span>
        {milestoneTitle ? (
          <span className="inline-flex max-w-[60%] items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25">
            <Flag className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{milestoneTitle}</span>
          </span>
        ) : null}
        {due ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              overdue
                ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            <CalendarClock className="h-2.5 w-2.5" />
            {format(due, "MMM d")}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        {assignee ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[8.5px] font-semibold text-white">
              {assignee.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assignee.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(assignee.name)
              )}
            </span>
            <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {assignee.name}
            </span>
          </span>
        ) : (
          <span className="text-[11px] italic text-zinc-400 dark:text-zinc-500">
            Unassigned
          </span>
        )}

        {canChangeStatus ? (
          <Select
            value={task.status}
            onValueChange={(v) => onStatusChange(v as TaskStatus)}
          >
            <SelectTrigger className="h-7 w-auto gap-1 px-2 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        TASK_STATUS_DOT_CLASS[s],
                      )}
                    />
                    {TASK_STATUS_LABEL[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
              TASK_STATUS_BADGE_CLASS[task.status],
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                TASK_STATUS_DOT_CLASS[task.status],
              )}
            />
            {TASK_STATUS_LABEL[task.status]}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskFormPopup({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  task,
  members,
  milestones,
  canSetDone,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  workspaceId: string;
  projectId: string;
  task: BoardTask | null;
  members: BoardMember[];
  milestones: BoardMilestone[];
  canSetDone: boolean;
  onSaved: () => void;
}) {
  const isEdit = task !== null;
  const statusOptions = canSetDone
    ? TASK_STATUSES
    : TASK_STATUSES.filter((s) => s !== "done");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium",
  );
  const [assignee, setAssignee] = useState(task?.assigneeId ?? "");
  const [milestone, setMilestone] = useState(task?.milestoneId ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(
    parseDateValue(task?.dueDate ?? null),
  );
  const [state, setState] = useState<TaskActionState>({});
  const [pending, startTransition] = useTransition();

  const assigneeOptions = useMemo<ComboboxOption<string>[]>(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.name,
        keywords: [m.email],
      })),
    [members],
  );
  const milestoneOptions = useMemo<ComboboxOption<string>[]>(
    () => milestones.map((m) => ({ value: m.id, label: m.title })),
    [milestones],
  );

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateTask(workspaceId, projectId, task.id, state, formData)
        : await createTask(workspaceId, projectId, state, formData);
      if (result?.ok) {
        setState({});
        onSaved();
      } else {
        setState(result);
      }
    });
  };

  const errs = state.errors;

  return (
    <Popup
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
      header={
        <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.1] via-white to-orange-500/[0.07] dark:from-amber-500/[0.18] dark:via-zinc-900 dark:to-orange-500/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 opacity-50 blur-3xl"
          />
          <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
              />
              <ListTodo className="relative h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  {isEdit ? "Edit task" : "Add a task"}
                </DialogTitle>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    TASK_STATUS_BADGE_CLASS[status],
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      TASK_STATUS_DOT_CLASS[status],
                    )}
                  />
                  {TASK_STATUS_LABEL[status]}
                </span>
              </div>
              <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {isEdit
                  ? "Update the details for this task."
                  : "Capture a task — assign it, set a due date, link a milestone."}
              </DialogDescription>
            </div>
          </div>
        </div>
      }
      className="max-h-[92vh] overflow-hidden p-0 sm:max-w-lg"
    >
      <form
        action={handleAction}
        className="max-h-[calc(92vh-9rem)] overflow-y-auto px-6 pb-6 pt-5"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="task-title" className={labelClass}>
              Title *
            </label>
            <Input
              id="task-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wire up the login form"
              required
              maxLength={200}
              autoComplete="off"
              className={cn(
                "mt-2",
                errs?.title &&
                  "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
              )}
            />
            {errs?.title ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.title}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="task-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="task-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Optional details, acceptance criteria…"
              className="mt-2 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-status" className={labelClass}>
                Status
              </label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
              >
                <SelectTrigger id="task-status" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            TASK_STATUS_DOT_CLASS[s],
                          )}
                        />
                        {TASK_STATUS_LABEL[s]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={status} />
            </div>
            <div>
              <label htmlFor="task-priority" className={labelClass}>
                Priority
              </label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger id="task-priority" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            TASK_PRIORITY_DOT_CLASS[p],
                          )}
                        />
                        {TASK_PRIORITY_LABEL[p]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="priority" value={priority} />
            </div>
          </div>

          <div>
            <label htmlFor="task-assignee" className={labelClass}>
              Assignee
            </label>
            <div className="mt-2">
              <Combobox<string>
                id="task-assignee"
                value={assignee}
                onChange={(v) => setAssignee(v)}
                options={assigneeOptions}
                placeholder="Unassigned"
                searchPlaceholder="Search teammates…"
                emptyText="No teammates match."
                allowClear
                invalid={Boolean(errs?.assignee)}
              />
            </div>
            <input type="hidden" name="assignee" value={assignee} />
            {errs?.assignee ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.assignee}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="task-milestone" className={labelClass}>
                Milestone
              </label>
              <div className="mt-2">
                <Combobox<string>
                  id="task-milestone"
                  value={milestone}
                  onChange={(v) => setMilestone(v)}
                  options={milestoneOptions}
                  placeholder={
                    milestones.length === 0 ? "No milestones yet" : "None"
                  }
                  searchPlaceholder="Search milestones…"
                  emptyText="No milestones match."
                  allowClear
                  disabled={milestones.length === 0}
                  invalid={Boolean(errs?.milestone)}
                />
              </div>
              <input type="hidden" name="milestone" value={milestone} />
              {errs?.milestone ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {errs.milestone}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="task-due" className={labelClass}>
                Due date
              </label>
              <div className="mt-2">
                <DatePicker
                  id="task-due"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="No due date"
                />
              </div>
              <input
                type="hidden"
                name="dueDate"
                value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
              />
            </div>
          </div>
        </div>

        {state.formError ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {state.formError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add task"}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

function DeleteTaskDialog({
  task,
  onOpenChange,
  workspaceId,
  projectId,
  onDeleted,
}: {
  task: BoardTask | null;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    if (!task) return;
    startTransition(async () => {
      const result = await deleteTask(workspaceId, projectId, task.id);
      if (result.ok) {
        setError(null);
        onDeleted();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Popup
      open={task !== null}
      onOpenChange={(open) => {
        if (pending) return;
        if (!open) setError(null);
        onOpenChange(open);
      }}
      title="Delete task"
      description={
        task
          ? `Remove “${task.title}”? This can't be undone.`
          : undefined
      }
      className="sm:max-w-md"
    >
      <div className="px-6 pb-6 pt-2">
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={confirmDelete}
            disabled={pending}
            aria-busy={pending}
            className="!from-rose-500 !to-red-600"
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Removing…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </div>
    </Popup>
  );
}

function TaskDetailsPopup({
  task,
  assignee,
  milestoneTitle,
  createdByName,
  onOpenChange,
}: {
  task: BoardTask | null;
  assignee: BoardMember | null;
  milestoneTitle: string;
  createdByName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const due = task?.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;

  return (
    <Popup
      open={task !== null}
      onOpenChange={onOpenChange}
      header={
        <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.1] via-white to-indigo-500/[0.07] dark:from-sky-500/[0.18] dark:via-zinc-900 dark:to-indigo-500/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-sky-500/30 to-indigo-500/20 opacity-50 blur-3xl"
          />
          <div className="relative flex items-start gap-3.5 px-6 pb-5 pt-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
              />
              <ListTodo className="relative h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[16px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-white">
                  {task?.title ?? "Task"}
                </DialogTitle>
                {task ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      TASK_STATUS_BADGE_CLASS[task.status],
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        TASK_STATUS_DOT_CLASS[task.status],
                      )}
                    />
                    {TASK_STATUS_LABEL[task.status]}
                  </span>
                ) : null}
              </div>
              <DialogDescription className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                Task details
              </DialogDescription>
            </div>
          </div>
        </div>
      }
      className="sm:max-w-lg"
    >
      {task ? (
        <div className="px-6 pb-6 pt-5">
          {task.description ? (
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {task.description}
            </p>
          ) : (
            <p className="text-[12.5px] italic text-zinc-400 dark:text-zinc-500">
              No description.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <DetailRow label="Priority">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  TASK_PRIORITY_BADGE_CLASS[task.priority],
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    TASK_PRIORITY_DOT_CLASS[task.priority],
                  )}
                />
                {TASK_PRIORITY_LABEL[task.priority]}
              </span>
            </DetailRow>
            <DetailRow label="Due date">
              {due ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    task.overdue && "text-rose-600 dark:text-rose-400",
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {format(due, "MMM d, yyyy")}
                </span>
              ) : (
                <span className="text-zinc-400 dark:text-zinc-500">—</span>
              )}
            </DetailRow>
            <DetailRow label="Assignee">
              {assignee ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[8.5px] font-semibold text-white">
                    {assignee.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assignee.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(assignee.name)
                    )}
                  </span>
                  {assignee.name}
                </span>
              ) : (
                <span className="italic text-zinc-400 dark:text-zinc-500">
                  Unassigned
                </span>
              )}
            </DetailRow>
            <DetailRow label="Milestone">
              {milestoneTitle ? (
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-violet-500" />
                  {milestoneTitle}
                </span>
              ) : (
                <span className="text-zinc-400 dark:text-zinc-500">—</span>
              )}
            </DetailRow>
            {createdByName ? (
              <DetailRow label="Created by">{createdByName}</DetailRow>
            ) : null}
          </dl>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Popup>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-[12.5px] text-zinc-700 dark:text-zinc-200">
        {children}
      </dd>
    </div>
  );
}
