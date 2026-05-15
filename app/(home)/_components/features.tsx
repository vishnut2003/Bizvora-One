import type { ReactNode } from "react";
import Eyebrow from "@/components/eyebrow";
import { Check } from "lucide-react";

type Feature = {
  title: string;
  body: string;
  icon: ReactNode;
  span?: string;
  visual?: ReactNode;
};

const iconClass = "h-5 w-5";

const features: Feature[] = [
  {
    title: "Your own workspace",
    body:
      "Spin up an isolated workspace in seconds. Invite teammates, set roles, and keep every customer record under one roof.",
    span: "lg:col-span-2",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M3 8h14M7 4v12" />
      </svg>
    ),
    visual: <WorkspaceVisual />,
  },
  {
    title: "Pipelines that fit",
    body: "Drag-and-drop deal pipelines that mirror how your team actually sells. No rigid templates.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="4" height="12" rx="1" />
        <rect x="8.5" y="4" width="4" height="8" rx="1" />
        <rect x="14" y="4" width="4" height="10" rx="1" />
      </svg>
    ),
  },
  {
    title: "Contacts in context",
    body: "Every email, note, call, and task tied to a contact — so the next conversation starts where the last one ended.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="10" cy="7" r="3" />
        <path d="M3.5 17a6.5 6.5 0 0 1 13 0" />
      </svg>
    ),
  },
  {
    title: "Automations, no code",
    body: "Move stages, send follow-ups, assign owners. Wire up the busywork once and let it run.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 2 4 11h5l-1 7 7-9h-5l1-7z" />
      </svg>
    ),
  },
  {
    title: "Reports you'll read",
    body: "Live dashboards for revenue, activity, and forecast. Pin the views your team checks daily.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 17V4M3 17h14" />
        <path d="M6 14V9M10 14V6M14 14v-3" />
      </svg>
    ),
  },
  {
    title: "Built for teams of any size",
    body:
      "From a solo founder to a 200-person sales org — the same workspace scales without rebuilding. Granular roles, SSO, and audit logs included.",
    span: "lg:col-span-3",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="7" cy="8" r="2.5" />
        <circle cx="13" cy="8" r="2.5" />
        <path d="M2.5 16a4.5 4.5 0 0 1 9 0M9 16a4.5 4.5 0 0 1 8.5-2" />
      </svg>
    ),
    visual: <TeamVisual />,
  },
];

export default function Features() {
  return (
    <section id="features" className="border-b border-zinc-200 py-24 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="max-w-2xl">
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a sales team needs. None of what they don&apos;t.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            Workspaces are isolated, customizable, and yours to shape — without the bloat
            of legacy CRMs.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className={`group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 ${f.span ?? ""}`}
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {f.body}
                  </p>
                </div>
              </div>
              {f.visual}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkspaceVisual() {
  const workspaces = [
    { name: "Acme Sales", role: "Owner", initials: "AS", active: true },
    { name: "Northwind Trading", role: "Admin", initials: "NT", active: false },
    { name: "Stark Ventures", role: "Member", initials: "SV", active: false },
  ];
  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Workspaces
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-500">3 of 5</span>
      </div>
      <ul className="space-y-1">
        {workspaces.map((w) => (
          <li
            key={w.name}
            className={`flex items-center justify-between rounded-md border px-2.5 py-2 ${
              w.active
                ? "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-semibold ${
                  w.active
                    ? "bg-gradient-to-br from-primary to-secondary text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {w.initials}
              </span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {w.name}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{w.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamVisual() {
  const seats = [
    { initials: "JD", tone: "primary" },
    { initials: "AS", tone: "secondary" },
    { initials: "KP", tone: "neutral" },
    { initials: "MR", tone: "neutral" },
    { initials: "TC", tone: "neutral" },
    { initials: "HN", tone: "neutral" },
  ];
  const toneClass: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    secondary: "bg-secondary/15 text-secondary",
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Members
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex -space-x-2">
            {seats.map((s) => (
              <span
                key={s.initials}
                className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[10px] font-semibold dark:border-zinc-900 ${toneClass[s.tone]}`}
              >
                {s.initials}
              </span>
            ))}
          </div>
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            +12
          </span>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Roles
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Owner", "Admin", "Sales", "Viewer"].map((r) => (
            <span
              key={r}
              className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Security
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-zinc-700 dark:text-zinc-300">
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500" />
            SSO &amp; SAML
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500" />
            Audit logs
          </li>
        </ul>
      </div>
    </div>
  );
}
