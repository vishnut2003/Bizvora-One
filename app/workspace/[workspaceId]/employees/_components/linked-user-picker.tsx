"use client";

import { X } from "lucide-react";

export type LinkableUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type Props = {
  candidates: LinkableUser[];
  value: string | null;
  onChange: (user: LinkableUser | null) => void;
};

// Presentational picker — the parent form owns the selected id and decides
// whether to autofill name/email. Metadata-only: linking never grants the
// chosen user any access.
export default function LinkedUserPicker({ candidates, value, onChange }: Props) {
  const selected = candidates.find((c) => c.id === value) ?? null;

  if (candidates.length === 0) {
    return (
      <p className="text-[12px] text-zinc-500 dark:text-zinc-500">
        No workspace users available to link.
      </p>
    );
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 dark:border-primary/40 dark:bg-primary/10">
        {selected.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 shrink-0 rounded-full ring-1 ring-zinc-200 dark:ring-white/10"
          />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[12px] font-semibold text-white">
            {(selected.name || selected.email).charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">
            {selected.name || selected.email}
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {selected.email} · linked account
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Unlink user"
          className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <select
      value=""
      onChange={(e) => {
        const u = candidates.find((c) => c.id === e.target.value) ?? null;
        onChange(u);
      }}
      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <option value="">Not linked — optional</option>
      {candidates.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name ? `${c.name} (${c.email})` : c.email}
        </option>
      ))}
    </select>
  );
}
