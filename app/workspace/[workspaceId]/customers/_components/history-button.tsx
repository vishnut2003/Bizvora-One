"use client";

import { useState } from "react";
import {
  CircleDot,
  FileText,
  History,
  MessageSquare,
  Pencil,
  Receipt,
  Sparkles,
  Tag as TagIcon,
  UserCircle2,
} from "lucide-react";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type { CustomerActivityType } from "@/lib/customer";

export type HistoryEntry = {
  id: string;
  type: CustomerActivityType;
  actorName: string;
  actorInitial: string;
  at: string;
  atAbs: string;
  summary: string;
  body?: string;
};

const ICONS: Record<CustomerActivityType, typeof Sparkles> = {
  created: Sparkles,
  status_changed: CircleDot,
  assignee_changed: UserCircle2,
  note_added: MessageSquare,
  tags_changed: TagIcon,
  details_updated: Pencil,
  billing_updated: Receipt,
};

const ACCENTS: Record<CustomerActivityType, string> = {
  created: "from-primary to-secondary",
  status_changed: "from-violet-500 to-fuchsia-600",
  assignee_changed: "from-blue-500 to-indigo-600",
  note_added: "from-emerald-500 to-teal-600",
  tags_changed:
    "from-zinc-500 to-zinc-700 dark:from-zinc-400 dark:to-zinc-600",
  details_updated:
    "from-zinc-500 to-zinc-700 dark:from-zinc-400 dark:to-zinc-600",
  billing_updated: "from-amber-500 to-orange-600",
};

type HistoryButtonProps = {
  customerName: string;
  entries: HistoryEntry[];
};

export default function HistoryButton({
  customerName,
  entries,
}: HistoryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Activity history for ${customerName}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
      >
        <History className="h-3.5 w-3.5" />
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        className="max-h-[88vh] overflow-hidden sm:max-w-xl"
      >
        <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
          />
          <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
              />
              <History className="relative h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Activity history
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Everything that&apos;s happened with{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {customerName}
                </span>
                .
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(88vh-7rem)] overflow-y-auto px-6 py-5">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center px-2 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <FileText className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
                No activity recorded yet.
              </p>
              <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Edits to this customer will start showing up here.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-4 pl-6">
              <span
                aria-hidden
                className="absolute left-[11px] top-1.5 bottom-1.5 w-px bg-zinc-100 dark:bg-zinc-800"
              />
              {entries.map((e) => {
                const Icon = ICONS[e.type];
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-6 top-0.5 grid h-6 w-6 place-items-center overflow-hidden rounded-md bg-gradient-to-br text-white shadow-sm",
                        ACCENTS[e.type],
                      )}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                      />
                      <Icon className="relative h-3 w-3" />
                    </span>
                    <div className="rounded-lg border border-zinc-200/70 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12.5px] leading-snug text-zinc-700 dark:text-zinc-300">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {e.actorName}
                        </span>
                        <span>{e.summary}</span>
                      </div>
                      <p
                        className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500"
                        title={e.atAbs}
                      >
                        {e.at}
                      </p>
                      {e.body ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-2.5 text-[12px] leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {e.body}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
            {entries.length} {entries.length === 1 ? "event" : "events"} ·
            newest first
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
          >
            Close
          </button>
        </div>
      </Popup>
    </>
  );
}
