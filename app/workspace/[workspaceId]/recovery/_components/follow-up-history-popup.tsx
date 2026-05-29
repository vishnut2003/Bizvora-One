"use client";

import { useState } from "react";
import { History, MessageSquareText } from "lucide-react";
import { format } from "date-fns";
import Popup from "@/components/popup";
import { timeAgo } from "@/lib/time";

export type FollowUpEntry = {
  // ISO timestamp string — serialized server-side so the prop crosses the
  // server → client boundary cleanly.
  at: string;
  byName: string;
  note: string;
};

type Props = {
  invoiceNumber: string;
  // Reverse-chronological, newest-first. Includes every entry (including the
  // latest one already shown on the recovery row) so the popup is a complete
  // history.
  entries: FollowUpEntry[];
  // Count of "earlier" entries — i.e. total - 1 (since the latest is already
  // visible on the row). Drives the button label.
  earlierCount: number;
};

export default function FollowUpHistoryPopup({
  invoiceNumber,
  entries,
  earlierCount,
}: Props) {
  const [open, setOpen] = useState(false);

  if (earlierCount <= 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-violet-600 underline-offset-2 transition-colors hover:text-violet-800 hover:underline dark:text-violet-300 dark:hover:text-violet-200"
        aria-label={`View ${earlierCount} earlier follow-up note${earlierCount === 1 ? "" : "s"} for ${invoiceNumber}`}
      >
        +{earlierCount} earlier
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        className="sm:max-w-lg"
        title={
          <span className="inline-flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Follow-up history
          </span>
        }
        description={
          <>
            All recorded follow-ups for{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {invoiceNumber}
            </span>
            , newest first.
          </>
        }
      >
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 pb-6 pt-2">
          {entries.map((entry, idx) => {
            const date = new Date(entry.at);
            return (
              <div
                key={`${entry.at}-${idx}`}
                className="rounded-md border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[12.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {entry.byName}
                  </p>
                  <p
                    className="shrink-0 text-[10.5px] text-zinc-500 dark:text-zinc-400"
                    title={format(date, "PPpp")}
                  >
                    {timeAgo(date)} · {format(date, "MMM d, yyyy")}
                  </p>
                </div>
                {entry.note ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-200">
                    {entry.note}
                  </p>
                ) : (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] italic text-zinc-400 dark:text-zinc-500">
                    <MessageSquareText className="h-3 w-3" />
                    No note recorded
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Popup>
    </>
  );
}
