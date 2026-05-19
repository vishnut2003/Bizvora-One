"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { removeCustomer } from "../actions";

type RemoveCustomerButtonProps = {
  workspaceId: string;
  customerId: string;
  customerName: string;
};

export default function RemoveCustomerButton({
  workspaceId,
  customerId,
  customerName,
}: RemoveCustomerButtonProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    if (!next) setFormError(undefined);
    setOpen(next);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await removeCustomer(workspaceId, customerId);
      if (result?.ok) {
        handleOpenChange(false);
      } else {
        setFormError(result?.formError ?? "Couldn't delete the customer.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${customerName}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Delete customer
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Permanently delete{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {customerName}
            </span>
            ? Notes and activity history will be removed too. This can&apos;t
            be undone.
          </DialogDescription>
        </div>

        <div className="px-6 pb-6 pt-4">
          {formError ? (
            <p
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {formError}
            </p>
          ) : null}

          <div className="-mx-6 flex items-center justify-end gap-2 border-t border-zinc-100 px-6 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={pending}
              aria-busy={pending}
              className="!bg-gradient-to-r !from-red-500 !to-red-600 !shadow-red-500/25 hover:!shadow-red-500/35"
            >
              {pending ? "Deleting…" : "Delete customer"}
            </Button>
          </div>
        </div>
      </Popup>
    </>
  );
}
