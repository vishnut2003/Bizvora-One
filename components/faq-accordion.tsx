"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export type FaqItem = { q: string; a: string };

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`px-6 py-5 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-950/40 ${
        open ? "bg-zinc-50/40 dark:bg-zinc-950/30" : ""
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
          {item.q}
        </span>
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
            open
              ? "rotate-45 border-primary/30 bg-primary/10 text-primary"
              : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
        </span>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 300ms ease-out",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <p
            className={`mt-3 max-w-3xl text-sm leading-7 text-zinc-600 transition-opacity duration-300 dark:text-zinc-400 ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Reusable FAQ accordion — a bordered card whose rows expand/collapse. */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((f) => (
        <FaqRow key={f.q} item={f} />
      ))}
    </div>
  );
}
