"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { removePayslip } from "../actions";

type Props = {
  workspaceId: string;
  runId: string;
  payslipId: string;
  employeeName: string;
};

export default function RemovePayslipButton({
  workspaceId,
  runId,
  payslipId,
  employeeName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removePayslip(workspaceId, runId, payslipId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleRemove}
        disabled={pending}
        aria-label={`Remove ${employeeName} from this run`}
        title={error ?? `Remove ${employeeName}`}
        className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}
