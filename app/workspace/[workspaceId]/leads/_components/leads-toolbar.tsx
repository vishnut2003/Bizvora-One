"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABEL,
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
} from "@/lib/lead";

type Member = { id: string; name: string };

export default function LeadsToolbar({
  members,
  currentUserId,
  showAssigneeFilter = true,
}: {
  members: Member[];
  currentUserId: string;
  showAssigneeFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const stage = params.get("stage") ?? "open";
  const priority = params.get("priority") ?? "all";
  const source = params.get("source") ?? "all";
  const assignee = params.get("assignee") ?? "all";

  const [localQ, setLocalQ] = useState(q);
  useEffect(() => setLocalQ(q), [q]);

  const navigate = (next: URLSearchParams) => {
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const setParam = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    navigate(next);
  };

  const handleSubmitQuery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setParam("q", localQ.trim(), "");
  };

  const clearAll = () => {
    setLocalQ("");
    navigate(new URLSearchParams());
  };

  const hasAnyFilter =
    q ||
    stage !== "open" ||
    priority !== "all" ||
    source !== "all" ||
    (showAssigneeFilter && assignee !== "all");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSubmitQuery} className="relative min-w-[200px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="search"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            onBlur={() => setParam("q", localQ.trim(), "")}
            placeholder="Search name, company, email…"
            className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </form>

        <FilterSelect
          value={stage}
          onChange={(v) => setParam("stage", v, "open")}
          label="Stage"
          options={[
            { value: "open", label: "Open (default)" },
            { value: "all", label: "All stages" },
            ...LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABEL[s] })),
          ]}
        />

        <FilterSelect
          value={priority}
          onChange={(v) => setParam("priority", v, "all")}
          label="Priority"
          options={[
            { value: "all", label: "All priorities" },
            ...LEAD_PRIORITIES.map((p) => ({
              value: p,
              label: LEAD_PRIORITY_LABEL[p],
            })),
          ]}
        />

        <FilterSelect
          value={source}
          onChange={(v) => setParam("source", v, "all")}
          label="Source"
          options={[
            { value: "all", label: "All sources" },
            ...LEAD_SOURCES.map((s) => ({
              value: s,
              label: LEAD_SOURCE_LABEL[s],
            })),
          ]}
        />

        {showAssigneeFilter ? (
          <FilterSelect
            value={assignee}
            onChange={(v) => setParam("assignee", v, "all")}
            label="Assignee"
            options={[
              { value: "all", label: "All assignees" },
              { value: "me", label: "Assigned to me" },
              { value: "unassigned", label: "Unassigned" },
              ...members
                .filter((m) => m.id !== currentUserId)
                .map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        ) : null}

        {hasAnyFilter ? (
          <button
            type="button"
            onClick={clearAll}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className="w-auto min-w-[140px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
