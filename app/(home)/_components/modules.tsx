"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowUpRight,
  Building2,
  Check,
  CreditCard,
  FileText,
  FolderKanban,
  IdCard,
  Receipt,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

type ModuleCard = {
  title: string;
  body: string;
  icon: ReactNode;
  span?: string;
  visual?: ReactNode;
  badge?: string;
  tagline: string;
  details: string;
  features: string[];
};

const modules: ModuleCard[] = [
  {
    title: "Customers & CRM",
    body:
      "A single source of truth for every customer. Notes, tasks, deals, and history — always one click away.",
    span: "lg:col-span-2",
    icon: <Users className="h-5 w-5" />,
    visual: <CustomersVisual />,
    tagline: "Every customer, one complete picture.",
    details:
      "Keep every customer relationship in one place. Each customer gets a full profile with contact details, open deals, notes, tasks, and a complete activity history — so anyone on your team can pick up a conversation without asking around.",
    features: [
      "Rich customer profiles with contact details and ownership",
      "Notes and tasks attached directly to each customer",
      "Deal history and total value at a glance",
      "Activity timeline of every interaction and change",
      "Convert quotes and vouchers without re-entering data",
    ],
  },
  {
    title: "Leads & Pipeline",
    body:
      "Track prospects from new to won across drag-and-drop stages tailored to your team.",
    icon: <UserPlus className="h-5 w-5" />,
    tagline: "From first touch to closed-won.",
    details:
      "Capture prospects and move them through a visual pipeline built around how your team actually sells. Drag leads between stages, set priorities and follow-up reminders, and convert won leads into customers in one click.",
    features: [
      "Drag-and-drop pipeline with customizable stages",
      "Priorities, tags, and assignees on every lead",
      "Follow-up reminders so nothing slips through",
      "Full activity history on each lead",
      "One-click conversion from lead to customer",
    ],
  },
  {
    title: "AI Proposals",
    badge: "New",
    body:
      "Draft proposals and quotes in seconds. Iterate over chat, export to PDF, send for signature.",
    icon: <FileText className="h-5 w-5" />,
    tagline: "Professional proposals in seconds, not hours.",
    details:
      "Describe the deal and let AI draft a polished proposal or quotation for you. Refine it over chat until it reads exactly right, then export a branded PDF and send it off for signature — all without leaving your workspace.",
    features: [
      "AI-drafted proposals and quotations from a short brief",
      "Iterate conversationally until it's right",
      "Branded, ready-to-send PDF export",
      "Send for signature directly",
      "Linked to the lead or customer it belongs to",
    ],
  },
  {
    title: "Projects & Tasks",
    body:
      "Turn won deals into delivery. Milestones, tasks, files, and a calendar — per project.",
    icon: <FolderKanban className="h-5 w-5" />,
    tagline: "Won the deal? Deliver it here.",
    details:
      "Turn closed deals into organized delivery. Every project gets its own milestones, task board, files, and calendar, so your team always knows what's due, who owns it, and how the project is tracking.",
    features: [
      "Milestones to break delivery into clear phases",
      "Task boards with owners and due dates",
      "Files kept alongside the work they belong to",
      "Per-project calendar of deadlines and events",
      "Progress visible to everyone on the project",
    ],
  },
  {
    title: "Accounts & Vouchers",
    body:
      "Tally-style sales orders, invoices, receipts, purchase orders, and payments — built in.",
    icon: <CreditCard className="h-5 w-5" />,
    tagline: "Familiar Tally-style accounting, built in.",
    details:
      "Run day-to-day accounting without a separate tool. Create sales orders, invoices, receipts, purchase orders, and payment vouchers in a familiar Tally-style flow — every voucher linked to the right customer and stamped in the audit log.",
    features: [
      "Sales orders, invoices, and receipts",
      "Purchase orders and payment vouchers",
      "Itemized entries with automatic totals",
      "Every voucher tied to a customer or party",
      "Audit log entry on every voucher",
    ],
  },
  {
    title: "HR, Roles & Workspaces",
    body:
      "Onboard employees, assign one of eight roles, and keep teams isolated per workspace — with audit trails and granular access.",
    span: "lg:col-span-3",
    icon: <IdCard className="h-5 w-5" />,
    visual: <RolesVisual />,
    tagline: "The right access for every person.",
    details:
      "Onboard your team and control exactly what each person can see and do. Assign one of eight built-in roles — from Owner to Team Member — and keep every team's data isolated per workspace, with an audit trail behind it all.",
    features: [
      "Eight built-in roles covering sales, accounts, HR, and delivery",
      "Simple employee onboarding and removal",
      "Data isolated per workspace",
      "Granular module access per role",
      "Audit trails on sensitive actions",
    ],
  },
];

export default function Modules() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ModuleCard | null>(null);

  function openModule(m: ModuleCard) {
    setActive(m);
    setOpen(true);
  }

  return (
    <section
      id="modules"
      className="border-b border-zinc-200 py-24 dark:border-zinc-800"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="max-w-2xl">
          <Eyebrow>Modules</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            A complete operating system for your business.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            Six tightly integrated modules. One workspace. No more bouncing
            between CRMs, project trackers, and accounting tools.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <article
              key={m.title}
              className={`group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/40 ${m.span ?? ""}`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-linear-to-br from-primary/15 to-secondary/15 text-primary ring-1 ring-inset ring-primary/20">
                    {m.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        <button
                          type="button"
                          onClick={() => openModule(m)}
                          className="cursor-pointer text-left focus:outline-none after:absolute after:inset-0 after:z-10"
                        >
                          {m.title}
                        </button>
                      </h3>
                      {m.badge ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                          <Sparkles className="h-2.5 w-2.5" />
                          {m.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {m.body}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-700" />
              </div>
              {m.visual}
            </article>
          ))}
        </div>
      </div>

      <Popup
        open={open}
        onOpenChange={setOpen}
        className="max-h-[88vh] overflow-hidden sm:max-w-lg"
      >
        {active ? (
          <>
            <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-white to-secondary/5 dark:from-primary/16 dark:via-zinc-900 dark:to-secondary/12"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
              />
              <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-b from-white/25 to-transparent"
                  />
                  <span className="relative [&>svg]:h-4 [&>svg]:w-4">
                    {active.icon}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                    {active.title}
                    {active.badge ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        <Sparkles className="h-2.5 w-2.5" />
                        {active.badge}
                      </span>
                    ) : null}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {active.tagline}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(88vh-10rem)] overflow-y-auto px-6 py-5">
              <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                {active.details}
              </p>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                What you get
              </p>
              <ul className="mt-2.5 space-y-2">
                {active.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                      <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
              >
                Close
              </button>
              <Link
                href="/signup"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-linear-to-r from-primary to-secondary px-3.5 text-[12.5px] font-semibold text-white shadow-sm shadow-primary/25 transition-opacity hover:opacity-90"
              >
                Start free trial
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : null}
      </Popup>
    </section>
  );
}

function CustomersVisual() {
  const rows = [
    { name: "Acme Co", owner: "JD", deals: 4, value: "$48k", status: "Active" },
    { name: "Hooli", owner: "AS", deals: 7, value: "$112k", status: "Active" },
    { name: "Wayne & Co", owner: "KP", deals: 2, value: "$24k", status: "Lead" },
  ];
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="grid grid-cols-12 border-b border-zinc-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        <span className="col-span-5">Customer</span>
        <span className="col-span-2">Owner</span>
        <span className="col-span-2">Deals</span>
        <span className="col-span-3 text-right">Value</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-12 items-center border-b border-zinc-200/70 px-3 py-2.5 text-xs last:border-b-0 dark:border-zinc-800/70"
          >
            <span className="col-span-5 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-linear-to-br from-primary/20 to-secondary/20 text-[9px] font-semibold text-primary">
                {r.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {r.name}
              </span>
            </span>
            <span className="col-span-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {r.owner}
              </span>
            </span>
            <span className="col-span-2 tabular-nums text-zinc-700 dark:text-zinc-300">
              {r.deals}
            </span>
            <span className="col-span-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RolesVisual() {
  const roles: { label: string; tone: string }[] = [
    { label: "Owner", tone: "bg-primary/10 text-primary ring-primary/20" },
    {
      label: "Admin",
      tone: "bg-zinc-900/10 text-zinc-900 ring-zinc-900/15 dark:bg-zinc-100/10 dark:text-zinc-100 dark:ring-zinc-100/15",
    },
    {
      label: "Sales Manager",
      tone: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
    },
    {
      label: "Sales Executive",
      tone: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
    },
    {
      label: "Accounts",
      tone: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
    },
    {
      label: "HR",
      tone: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
    },
    {
      label: "Project Manager",
      tone: "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
    },
    {
      label: "Team Member",
      tone: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25",
    },
  ];
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:col-span-2 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Built-in roles
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span
              key={r.label}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${r.tone}`}
            >
              {r.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Workspace controls
        </p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500" />
            <Building2 className="h-3 w-3 text-zinc-400" />
            Isolated per workspace
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500" />
            <Receipt className="h-3 w-3 text-zinc-400" />
            Audit log on every voucher
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500" />
            <Users className="h-3 w-3 text-zinc-400" />
            Granular module access
          </li>
        </ul>
      </div>
    </div>
  );
}
