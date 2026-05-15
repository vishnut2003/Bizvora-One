import type { ReactNode } from "react";
import Eyebrow from "@/components/eyebrow";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

type Step = {
  n: string;
  title: string;
  body: string;
  icon: ReactNode;
  visual: ReactNode;
};

const iconClass = "h-5 w-5";

const steps: Step[] = [
  {
    n: "01",
    title: "Create your account",
    body: "Sign up with email or single sign-on. No credit card, no setup call.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="8" cy="7" r="3" />
        <path d="M2.5 17a5.5 5.5 0 0 1 11 0" />
        <path d="M16 4v4M14 6h4" />
      </svg>
    ),
    visual: <SignupVisual />,
  },
  {
    n: "02",
    title: "Spin up a workspace",
    body: "Name your workspace, pick a starting pipeline, and invite your teammates.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M3 8h14" />
      </svg>
    ),
    visual: <WorkspaceVisual />,
  },
  {
    n: "03",
    title: "Start closing deals",
    body: "Import contacts, log deals, automate follow-ups — all on day one.",
    icon: (
      <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 14l4-4 3 3 6-7" />
        <path d="M11 6h5v5" />
      </svg>
    ),
    visual: <PipelineMoveVisual />,
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-b border-zinc-200 bg-zinc-50/60 py-24 dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black_30%,transparent_85%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]"
      />

      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="max-w-2xl">
          <Eyebrow>Getting started</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From signup to your first deal in under a minute.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            Three steps. That&apos;s the whole onboarding.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.n}
              className="relative flex flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold tracking-widest text-zinc-400 dark:text-zinc-500">
                  STEP {step.n}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  {step.icon}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {step.body}
              </p>

              <div className="mt-6">{step.visual}</div>

              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-400 lg:grid dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                >
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SignupVisual() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
        Work email
      </p>
      <div className="mt-1.5 flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-zinc-900 dark:text-zinc-100">you@acme.co</span>
        <span className="ml-px h-3.5 w-px animate-pulse bg-primary" />
      </div>
      <div className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-secondary px-3 text-[11px] font-medium text-white">
        Continue
        <ArrowRightIcon className="h-3 w-3" />
      </div>
    </div>
  );
}

function WorkspaceVisual() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
        Workspace name
      </p>
      <div className="mt-1.5 flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        Acme Sales
      </div>
      <p className="mt-3 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
        Sales pipeline template
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {[
          { label: "Inbound", active: true },
          { label: "Outbound", active: false },
          { label: "Renewals", active: false },
        ].map((p) => (
          <span
            key={p.label}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${
              p.active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            {p.active ? <CheckIcon className="h-2.5 w-2.5" /> : null}
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PipelineMoveVisual() {
  const cols = [
    { label: "Qualified", deal: null },
    { label: "Proposal", deal: null },
    { label: "Closing", deal: { name: "Hooli", amount: "$67k" } },
  ];
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="grid grid-cols-3 gap-1.5">
        {cols.map((c) => (
          <div
            key={c.label}
            className="rounded-md border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              {c.label}
            </p>
            <div className="mt-1.5 space-y-1">
              {c.deal ? (
                <div className="rounded border border-primary/30 bg-primary/5 p-1 text-[9px] dark:border-primary/40 dark:bg-primary/10">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                    {c.deal.name}
                  </p>
                  <p className="font-semibold text-primary">{c.deal.amount}</p>
                </div>
              ) : (
                <>
                  <div className="h-3 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 rounded bg-zinc-100 dark:bg-zinc-800" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Hooli</span>{" "}
          moved to Closing · just now
        </span>
      </div>
    </div>
  );
}
