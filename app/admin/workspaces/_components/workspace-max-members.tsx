"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import { setWorkspaceMaxMembers } from "../actions";

export default function WorkspaceMaxMembers({
  workspaceId,
  maxMembers,
  memberCount,
}: {
  workspaceId: string;
  maxMembers: number | null;
  memberCount: number;
}) {
  const initial = maxMembers == null ? "" : String(maxMembers);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = value.trim() !== saved;

  const handleSave = () => {
    setError(null);
    setJustSaved(false);

    const trimmed = value.trim();
    let parsed: number | null;
    if (trimmed === "") {
      parsed = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 1) {
        setError("Enter a whole number of 1 or more, or leave empty.");
        return;
      }
      parsed = n;
    }

    startTransition(async () => {
      const result = await setWorkspaceMaxMembers(workspaceId, parsed);
      if (result.ok) {
        setSaved(trimmed);
        setJustSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setJustSaved(false);
          }}
          placeholder="Unlimited"
          className="h-9 w-28"
          aria-label="Maximum members"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSave}
          disabled={pending || !dirty}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error ? (
        <span className="text-[11px] text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : justSaved ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
          <Check className="h-3 w-3" />
          Saved
        </span>
      ) : (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          Leave empty for unlimited · {memberCount} current member
          {memberCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
