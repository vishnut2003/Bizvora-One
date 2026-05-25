"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarClock,
  Check,
  Flag,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Button from "@/components/button";
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
  MILESTONE_STATUSES,
  MILESTONE_STATUS_BADGE_CLASS,
  MILESTONE_STATUS_DOT_CLASS,
  MILESTONE_STATUS_LABEL,
  type MilestoneStatus,
} from "@/lib/milestone";
import {
  createMilestone,
  deleteMilestone,
  setMilestoneStatus,
  updateMilestone,
  type MilestoneActionState,
} from "../actions";

export type ListMilestone = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  overdue: boolean;
  status: MilestoneStatus;
  taskTotal: number;
  taskDone: number;
};

const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function MilestonesList({
  workspaceId,
  projectId,
  milestones,
  canManage,
}: {
  workspaceId: string;
  projectId: string;
  milestones: ListMilestone[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ListMilestone | null>(null);
  const [deleting, setDeleting] = useState<ListMilestone | null>(null);
  const [, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function toggleStatus(m: ListMilestone) {
    const next: MilestoneStatus = m.status === "completed" ? "open" : "completed";
    startTransition(async () => {
      await setMilestoneStatus(workspaceId, projectId, m.id, next);
      router.refresh();
    });
  }

  return (
    <>
      {canManage ? (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" />
            New milestone
          </Button>
        </div>
      ) : null}

      {milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-500/30">
            <Flag className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
            No milestones yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {canManage
              ? "Add milestones to mark key dates, then attach tasks to track progress toward each one."
              : "Milestones for this project will show up here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {milestones.map((m) => {
            const pct =
              m.taskTotal > 0
                ? Math.round((m.taskDone / m.taskTotal) * 100)
                : 0;
            const due = m.dueDate ? new Date(`${m.dueDate}T00:00:00`) : null;
            const overdue = m.overdue;
            return (
              <li
                key={m.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {m.title}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                          MILESTONE_STATUS_BADGE_CLASS[m.status],
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            MILESTONE_STATUS_DOT_CLASS[m.status],
                          )}
                        />
                        {MILESTONE_STATUS_LABEL[m.status]}
                      </span>
                      {due ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11.5px]",
                            overdue
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          <CalendarClock className="h-3 w-3" />
                          {format(due, "MMM d, yyyy")}
                        </span>
                      ) : null}
                    </div>
                    {m.description ? (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {m.description}
                      </p>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleStatus(m)}
                        aria-label={
                          m.status === "completed"
                            ? "Reopen milestone"
                            : "Mark complete"
                        }
                        title={
                          m.status === "completed"
                            ? "Reopen"
                            : "Mark complete"
                        }
                        className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                      >
                        {m.status === "completed" ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(m);
                          setFormOpen(true);
                        }}
                        aria-label="Edit milestone"
                        className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(m)}
                        aria-label="Delete milestone"
                        className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>
                      {m.taskTotal === 0
                        ? "No tasks linked"
                        : `${m.taskDone} of ${m.taskTotal} tasks done`}
                    </span>
                    {m.taskTotal > 0 ? (
                      <span className="tabular-nums font-medium text-zinc-600 dark:text-zinc-300">
                        {pct}%
                      </span>
                    ) : null}
                  </div>
                  {m.taskTotal > 0 ? (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <>
          <MilestoneFormPopup
            key={editing?.id ?? "new"}
            open={formOpen}
            onOpenChange={setFormOpen}
            workspaceId={workspaceId}
            projectId={projectId}
            milestone={editing}
            onSaved={() => {
              setFormOpen(false);
              router.refresh();
            }}
          />
          <DeleteMilestoneDialog
            milestone={deleting}
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
        </>
      ) : null}
    </>
  );
}

function MilestoneFormPopup({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  milestone,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  workspaceId: string;
  projectId: string;
  milestone: ListMilestone | null;
  onSaved: () => void;
}) {
  const isEdit = milestone !== null;
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [status, setStatus] = useState<MilestoneStatus>(
    milestone?.status ?? "open",
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    parseDateValue(milestone?.dueDate ?? null),
  );
  const [state, setState] = useState<MilestoneActionState>({});
  const [pending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateMilestone(
            workspaceId,
            projectId,
            milestone.id,
            state,
            formData,
          )
        : await createMilestone(workspaceId, projectId, state, formData);
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
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.1] via-white to-fuchsia-500/[0.07] dark:from-violet-500/[0.18] dark:via-zinc-900 dark:to-fuchsia-500/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 opacity-50 blur-3xl"
          />
          <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-500/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
              />
              <Flag className="relative h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  {isEdit ? "Edit milestone" : "New milestone"}
                </DialogTitle>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    MILESTONE_STATUS_BADGE_CLASS[status],
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      MILESTONE_STATUS_DOT_CLASS[status],
                    )}
                  />
                  {MILESTONE_STATUS_LABEL[status]}
                </span>
              </div>
              <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {isEdit
                  ? "Update this milestone's details."
                  : "Mark a key date or deliverable for this project."}
              </DialogDescription>
            </div>
          </div>
        </div>
      }
      className="sm:max-w-lg"
    >
      <form action={handleAction} className="px-6 pb-6 pt-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="milestone-title" className={labelClass}>
              Title *
            </label>
            <Input
              id="milestone-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Beta launch"
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
            <label htmlFor="milestone-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="milestone-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Optional context or definition of done."
              className="mt-2 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="milestone-status" className={labelClass}>
                Status
              </label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MilestoneStatus)}
              >
                <SelectTrigger id="milestone-status" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            MILESTONE_STATUS_DOT_CLASS[s],
                          )}
                        />
                        {MILESTONE_STATUS_LABEL[s]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={status} />
            </div>
            <div>
              <label htmlFor="milestone-due" className={labelClass}>
                Due date
              </label>
              <div className="mt-2">
                <DatePicker
                  id="milestone-due"
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
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create milestone"}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

function DeleteMilestoneDialog({
  milestone,
  onOpenChange,
  workspaceId,
  projectId,
  onDeleted,
}: {
  milestone: ListMilestone | null;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    if (!milestone) return;
    startTransition(async () => {
      const result = await deleteMilestone(workspaceId, projectId, milestone.id);
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
      open={milestone !== null}
      onOpenChange={(open) => {
        if (pending) return;
        if (!open) setError(null);
        onOpenChange(open);
      }}
      title="Delete milestone"
      description={
        milestone
          ? `Remove “${milestone.title}”? Linked tasks stay, but lose this milestone.`
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
