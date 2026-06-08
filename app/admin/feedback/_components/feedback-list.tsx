"use client";

import { useMemo, useState, useTransition } from "react";
import { Bug, Lightbulb, MessageSquare, Search, Trash2 } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import {
  FEEDBACK_CATEGORY_LABEL,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  type FeedbackCategory,
  type FeedbackDTO,
  type FeedbackStatus,
} from "@/lib/feedback";
import { deleteFeedback, setFeedbackStatus } from "../actions";

const categoryIcon: Record<
  FeedbackCategory,
  typeof Bug
> = {
  bug: Bug,
  idea: Lightbulb,
  other: MessageSquare,
};

const categoryBadge: Record<FeedbackCategory, string> = {
  bug: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  idea: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  other:
    "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25",
};

const statusBadge: Record<FeedbackStatus, string> = {
  new: "bg-primary/10 text-primary ring-primary/20 dark:bg-primary/15 dark:ring-primary/25",
  reviewed:
    "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
  resolved:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
};

const selectClasses =
  "h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

type StatusFilter = "all" | FeedbackStatus;

export default function FeedbackList({
  feedback,
}: {
  feedback: FeedbackDTO[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feedback.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (!q) return true;
      return (
        f.message.toLowerCase().includes(q) ||
        f.authorName.toLowerCase().includes(q) ||
        f.authorEmail.toLowerCase().includes(q) ||
        f.workspaceName.toLowerCase().includes(q)
      );
    });
  }, [query, statusFilter, feedback]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search message, author or workspace…"
            className="h-10 pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={cn(selectClasses, "h-10 sm:w-44")}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FEEDBACK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
            No feedback to show.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((f) => (
              <FeedbackRow key={f.id} feedback={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackRow({ feedback: f }: { feedback: FeedbackDTO }) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = categoryIcon[f.category];

  function handleStatusChange(next: FeedbackStatus) {
    setError(null);
    startTransition(async () => {
      const res = await setFeedbackStatus(f.id, next);
      if (!res.ok) setError(res.error);
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteFeedback(f.id);
      if (!res.ok) {
        setError(res.error);
        setConfirmOpen(false);
      }
      // On success the row is revalidated away.
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-3.5 px-4 py-3.5 sm:px-5">
      <span
        className={cn(
          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset",
          categoryBadge[f.category],
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset",
              categoryBadge[f.category],
            )}
          >
            {FEEDBACK_CATEGORY_LABEL[f.category]}
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset",
              statusBadge[f.status],
            )}
          >
            {FEEDBACK_STATUS_LABEL[f.status]}
          </span>
        </div>

        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          {f.message}
        </p>

        <p className="mt-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
          {f.authorName || "Unknown"}
          {f.authorEmail ? (
            <span className="text-zinc-400 dark:text-zinc-500">
              {" · "}
              {f.authorEmail}
            </span>
          ) : null}
          <span className="text-zinc-400 dark:text-zinc-500">
            {" · "}
            {f.workspaceName}
            {" · "}
            {timeAgo(f.createdAt)}
          </span>
        </p>

        {error ? (
          <p className="mt-1.5 text-[12px] text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <select
          value={f.status}
          onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
          disabled={pending}
          className={selectClasses}
          aria-label="Change status"
        >
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FEEDBACK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          aria-label="Delete feedback"
          className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Popup
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!pending) setConfirmOpen(next);
        }}
      >
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Delete feedback?
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            This permanently removes the feedback entry. This can&apos;t be
            undone.
          </DialogDescription>
        </div>
        <div className="px-6 pb-6 pt-4">
          <div className="-mx-6 flex items-center justify-end gap-2 border-t border-zinc-100 px-6 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
              aria-busy={pending}
              className="from-rose-500 to-rose-600 shadow-rose-500/25 hover:shadow-rose-600/35"
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Popup>
    </div>
  );
}
