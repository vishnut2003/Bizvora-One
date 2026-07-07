"use client";

import { useState } from "react";
import Eyebrow from "@/components/eyebrow";
import { Plus } from "lucide-react";

type Item = { q: string; a: string };

const faqs: Item[] = [
  {
    q: "What exactly is a workspace?",
    a: "A workspace is your isolated tenant — your customers, deals, projects, vouchers, and employees all live inside it. Invite teammates, assign roles, and nothing leaks across workspaces.",
  },
  {
    q: "How is BizvoraOne different from a regular CRM?",
    a: "Most CRMs stop at deals and contacts. BizvoraOne also ships with Projects, Tally-style Accounts (sales/purchase vouchers, receipts, payments), and HR — all wired together in one workspace.",
  },
  {
    q: "What can the AI Proposals feature actually do?",
    a: "Chat-style proposal drafting. Describe the deal, iterate over messages, and export a polished PDF — without leaving the customer record. Built on Anthropic's Claude.",
  },
  {
    q: "Which roles are supported out of the box?",
    a: "Eight: Owner, Admin, Sales Manager, Sales Executive, Accounts, HR, Project Manager, and Team Member. Each gets a tailored sidebar and dashboard.",
  },
  {
    q: "Can I sign in with Google?",
    a: "Yes — sign up and sign in with Google or email/password.",
  },
  {
    q: "Is my data really isolated per workspace?",
    a: "Yes. Every record is scoped to a workspace ID at the data layer, and access checks run on every request. You can run multiple workspaces from the same account.",
  },
];

function FaqItem({ item }: { item: Item }) {
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

export default function FAQ() {
  return (
    <section id="faq" className="border-b border-zinc-200 py-24 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            Still wondering? Reach out — we&apos;ll happily walk you through a
            workspace.
          </p>
        </div>

        <div className="mt-14 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {faqs.map((f) => (
            <FaqItem key={f.q} item={f} />
          ))}
        </div>
      </div>
    </section>
  );
}
