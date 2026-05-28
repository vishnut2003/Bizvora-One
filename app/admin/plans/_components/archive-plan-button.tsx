"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import Popup from "@/components/popup";
import { buttonClasses } from "@/components/button";
import { archivePlan, unarchivePlan } from "../actions";

type ArchivePlanButtonProps = {
  planId: string;
  planName: string;
  archived: boolean;
  subscriberCount: number;
};

export default function ArchivePlanButton({
  planId,
  planName,
  archived,
  subscriberCount,
}: ArchivePlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = archived
        ? await unarchivePlan(planId)
        : await archivePlan(planId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {archived ? (
          <>
            <ArchiveRestore className="h-3 w-3" />
            Unarchive
          </>
        ) : (
          <>
            <Archive className="h-3 w-3" />
            Archive
          </>
        )}
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        title={archived ? `Unarchive ${planName}?` : `Archive ${planName}?`}
        description={
          archived
            ? "The plan becomes visible to admins again. Toggle visibility separately to show on the pricing page."
            : "The plan will be hidden from new sign-ups."
        }
      >
        <div className="space-y-4 px-6 pb-6">
          {!archived && subscriberCount > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-medium">
                {subscriberCount}{" "}
                {subscriberCount === 1 ? "workspace" : "workspaces"} on this
                plan
              </p>
              <p className="mt-1">
                They will keep being charged this price until they cancel or
                switch plans. Razorpay does not back-port plan changes.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              {pending
                ? archived
                  ? "Unarchiving…"
                  : "Archiving…"
                : archived
                  ? "Unarchive"
                  : "Archive plan"}
            </button>
          </div>
        </div>
      </Popup>
    </>
  );
}
