import Link from "next/link";
import { buttonClasses } from "@/components/button";
import { ArrowRight } from "lucide-react";

const pipeline = [
  {
    stage: "Qualified",
    count: 4,
    sum: "$48,200",
    deals: [
      { name: "Northwind Trading", amount: "$24,800", owner: "JD", updated: "2h ago" },
      { name: "Acme Co", amount: "$12,400", owner: "AS", updated: "Yesterday" },
    ],
  },
  {
    stage: "Proposal sent",
    count: 3,
    sum: "$71,400",
    deals: [
      { name: "Wayne Enterprises", amount: "$45,000", owner: "KP", updated: "3h ago" },
      { name: "Soylent Inc", amount: "$23,200", owner: "MR", updated: "5d ago" },
    ],
  },
  {
    stage: "Closing",
    count: 2,
    sum: "$91,500",
    deals: [
      { name: "Pied Piper", amount: "$24,500", owner: "JD", updated: "1h ago" },
      { name: "Hooli", amount: "$67,000", owner: "AS", updated: "Today" },
    ],
  },
];

const customers = ["NORTHWIND", "ACME CO.", "WAYNE & CO", "STARK", "HOOLI", "INITECH"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_-10%,rgba(142,81,255,0.10),transparent_70%)] dark:bg-[radial-gradient(70%_60%_at_50%_-10%,rgba(142,81,255,0.16),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_80%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-20 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#features"
            className="group inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/80 py-1 pl-1 pr-4 text-xs text-zinc-700 backdrop-blur transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              New
            </span>
            <span>Workspaces are open for sign-ups</span>
            <svg
              className="h-3 w-3 text-zinc-400 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h6M7 3l3 3-3 3" />
            </svg>
          </a>

          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl lg:text-[5rem] lg:leading-[1.05] dark:text-white">
            The CRM your team will{" "}
            <span className="text-primary">actually</span> use.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Build a workspace tailored to how you sell. Track pipelines, manage contacts,
            and automate the busywork — without per-seat surprises.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={buttonClasses({
                variant: "primary",
                size: "md",
                className: "w-full sm:w-auto",
              })}
            >
              Start your workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className={buttonClasses({
                variant: "secondary",
                size: "md",
                className: "w-full sm:w-auto",
              })}
            >
              See how it works
            </a>
          </div>

          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
            Free to start · No credit card required · Cancel anytime
          </p>
        </div>

        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/[0.06] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Sales pipeline
                </h3>
                <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                  9 open deals · $211,100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 3h8M3.5 6h5M5 9h2" />
                  </svg>
                  Filter
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
                >
                  + New deal
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-zinc-50/60 p-5 sm:grid-cols-3 dark:bg-zinc-950/40">
              {pipeline.map((column) => (
                <div key={column.stage} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        {column.stage}
                      </span>
                      <span className="rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {column.count}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {column.sum}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {column.deals.map((deal) => (
                      <div
                        key={deal.name}
                        className="rounded-md border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {deal.name}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {deal.amount}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {deal.owner}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-500">
                            {deal.updated}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
            Trusted by teams at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
            {customers.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold tracking-[0.15em] text-zinc-400 dark:text-zinc-600"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
