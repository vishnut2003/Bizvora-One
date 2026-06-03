"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import Button from "@/components/button";
import { addEmployeeToRun } from "../actions";

export type AddCandidate = {
  id: string;
  name: string;
  empId: string;
};

type Props = {
  workspaceId: string;
  runId: string;
  candidates: AddCandidate[];
};

export default function AddPayslipControl({
  workspaceId,
  runId,
  candidates,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  function handleAdd() {
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const res = await addEmployeeToRun(workspaceId, runId, value);
      if (res.ok) {
        setValue("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 sm:w-64 sm:flex-none"
        >
          <option value="">Add an employee…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.empId})
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!value || pending}
          onClick={handleAdd}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>
      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
