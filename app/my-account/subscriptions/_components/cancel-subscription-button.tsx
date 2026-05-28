"use client";

import { useState, useTransition } from "react";
import Popup from "@/components/popup";
import { buttonClasses } from "@/components/button";
import { cancelSubscription } from "../../actions";

type CancelSubscriptionButtonProps = {
  workspaceId: string;
  workspaceName: string;
  endDate: string;
};

export default function CancelSubscriptionButton({
  workspaceId,
  workspaceName,
  endDate,
}: CancelSubscriptionButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription(workspaceId);
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
        className="text-[12px] font-medium text-rose-600 hover:underline dark:text-rose-400"
      >
        Cancel subscription
      </button>

      <Popup
        open={open}
        onOpenChange={setOpen}
        title={`Cancel ${workspaceName}?`}
        description={`The workspace stays active until ${endDate}. After that, it'll be suspended and you'll need to re-subscribe to reactivate.`}
      >
        <div className="space-y-4 px-6 pb-6">
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
              Keep subscription
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              {pending ? "Cancelling…" : "Cancel at period end"}
            </button>
          </div>
        </div>
      </Popup>
    </>
  );
}
