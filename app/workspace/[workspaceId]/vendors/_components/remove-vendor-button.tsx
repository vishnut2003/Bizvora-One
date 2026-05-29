"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import { deleteVendor } from "../actions";

type Props = {
  workspaceId: string;
  vendorId: string;
  vendorName: string;
};

export default function RemoveVendorButton({
  workspaceId,
  vendorId,
  vendorName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteVendor(workspaceId, vendorId);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
        aria-label={`Remove ${vendorName}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        className="sm:max-w-md"
        title="Remove vendor"
        description={
          <>
            Are you sure you want to remove{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {vendorName}
            </span>
            ? Past purchase vouchers will keep the snapshotted vendor details,
            but the vendor won&apos;t appear in new pickers.
          </>
        }
      >
        <div className="space-y-4 px-6 pb-6 pt-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
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
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </Button>
          </div>
        </div>
      </Popup>
    </>
  );
}
