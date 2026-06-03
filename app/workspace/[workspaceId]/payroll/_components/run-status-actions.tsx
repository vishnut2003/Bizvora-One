"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Banknote, Loader2, Trash2, XCircle } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import type { PayrollRunStatus } from "@/lib/payroll";
import {
  approveRun,
  cancelRun,
  deleteRun,
  markRunPaid,
} from "../actions";

type Props = {
  workspaceId: string;
  runId: string;
  status: PayrollRunStatus;
  payslipCount: number;
};

type Pending = null | "approve" | "paid" | "cancel" | "delete";

export default function RunStatusActions({
  workspaceId,
  runId,
  status,
  payslipCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "cancel" | "delete">(null);

  function run(kind: Exclude<Pending, null>, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setPending(kind);
    startTransition(async () => {
      const res = await fn();
      setPending(null);
      if (res.ok) {
        setConfirm(null);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === "draft" ? (
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isPending || payslipCount < 1}
              onClick={() => run("approve", () => approveRun(workspaceId, runId))}
            >
              {pending === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BadgeCheck className="h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirm("delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </>
        ) : null}

        {status === "approved" ? (
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={() => run("paid", () => markRunPaid(workspaceId, runId))}
            >
              {pending === "paid" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Banknote className="h-3.5 w-3.5" />
              )}
              Mark paid
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirm("cancel")}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel run
            </Button>
          </>
        ) : null}

        {status === "cancelled" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirm("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <Popup
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        className="sm:max-w-md"
        title="Cancel payroll run?"
        description="The run will be marked cancelled. Payslips are kept for audit, but the run can't be paid afterward."
      >
        <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirm(null)}
          >
            Keep run
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending}
            onClick={() => run("cancel", () => cancelRun(workspaceId, runId))}
          >
            {pending === "cancel" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Cancel run
          </Button>
        </div>
      </Popup>

      <Popup
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        className="sm:max-w-md"
        title="Delete payroll run?"
        description="This permanently deletes the run and all its payslips. This can't be undone."
      >
        <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirm(null)}
          >
            Keep run
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run("delete", async () => {
                const res = await deleteRun(workspaceId, runId);
                if (res.ok) router.push(`/workspace/${workspaceId}/payroll`);
                return res;
              })
            }
          >
            {pending === "delete" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete run
          </Button>
        </div>
      </Popup>
    </div>
  );
}
