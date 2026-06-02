import Link from "next/link";
import { buttonClasses } from "@/components/button";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  IdCard,
  Sparkles,
  UserPlus,
} from "lucide-react";

const modules = [
  { label: "CRM", icon: UserPlus },
  { label: "AI Proposals", icon: FileText },
  { label: "Projects", icon: FolderKanban },
  { label: "Accounts", icon: CreditCard },
  { label: "HR", icon: IdCard },
  { label: "Workspaces", icon: Building2 },
];

const pipeline = [
  {
    stage: "Qualified",
    count: 4,
    sum: "$48,200",
    tone: "violet",
    deals: [
      { name: "Northwind Trading", amount: "$24,800", owner: "JD", updated: "2h" },
      { name: "Acme Co", amount: "$12,400", owner: "AS", updated: "1d" },
    ],
  },
  {
    stage: "Proposal sent",
    count: 3,
    sum: "$71,400",
    tone: "blue",
    deals: [
      { name: "Wayne Enterprises", amount: "$45,000", owner: "KP", updated: "3h" },
      { name: "Soylent Inc", amount: "$23,200", owner: "MR", updated: "5d" },
    ],
  },
  {
    stage: "Closing",
    count: 2,
    sum: "$91,500",
    tone: "emerald",
    deals: [
      { name: "Pied Piper", amount: "$24,500", owner: "JD", updated: "1h" },
      { name: "Hooli", amount: "$67,000", owner: "AS", updated: "Today" },
    ],
  },
];

const stageDot: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
};

const customers = ["NORTHWIND", "ACME CO.", "WAYNE & CO", "STARK", "HOOLI", "INITECH"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_-10%,rgba(142,81,255,0.14),transparent_70%),radial-gradient(40%_40%_at_85%_10%,rgba(225,42,251,0.10),transparent_70%)] dark:bg-[radial-gradient(70%_60%_at_50%_-10%,rgba(142,81,255,0.22),transparent_70%),radial-gradient(40%_40%_at_85%_10%,rgba(225,42,251,0.16),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_80%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-14 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#modules"
            className="group inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white/80 py-1 pl-1 pr-3 text-xs text-zinc-700 backdrop-blur transition-colors hover:bg-white sm:gap-3 sm:pr-4 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-2.5 py-0.5 text-[11px] font-semibold text-white">
              <Sparkles className="h-3 w-3" />
              New
            </span>
            <span className="truncate">
              AI Proposals are live
              <span className="hidden sm:inline"> — draft a quote in seconds</span>
            </span>
            <svg
              className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
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

          <h1 className="mt-6 text-balance text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-zinc-900 sm:mt-8 sm:text-6xl sm:leading-tight lg:text-[5rem] lg:leading-[1.05] dark:text-white">
            One workspace for{" "}
            <span className="relative inline-block">
              <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                sales, projects
              </span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-linear-to-r from-primary/40 to-secondary/40 blur-sm"
              />
            </span>{" "}
            &amp; accounts.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-zinc-600 sm:mt-6 sm:text-lg sm:leading-8 dark:text-zinc-400">
            BizvoraOne unifies your customers, deals, proposals, projects, vouchers,
            and team — in a single workspace your whole company can use.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
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
              href="#modules"
              className={buttonClasses({
                variant: "secondary",
                size: "md",
                className: "w-full sm:w-auto",
              })}
            >
              Explore the modules
            </a>
          </div>

          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
            All modules included · 8 built-in roles · Set up in under a minute
          </p>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {modules.map((m) => (
              <li
                key={m.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-700 backdrop-blur transition-colors hover:border-primary/30 hover:text-primary dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:text-primary"
              >
                <m.icon className="h-3 w-3" />
                {m.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-linear-to-br from-primary/20 via-transparent to-secondary/20 blur-2xl"
          />
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/[0.08] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
                <h3 className="hidden text-sm font-semibold text-zinc-900 sm:block dark:text-zinc-100">
                  Acme Sales · Pipeline
                </h3>
                <span className="hidden text-xs text-zinc-500 lg:inline dark:text-zinc-400">
                  9 open deals · $211,100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:inline-flex dark:text-emerald-400">
                  <span className="relative grid h-1.5 w-1.5 place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-linear-to-r from-primary to-secondary px-2.5 py-1 text-xs font-medium text-white shadow-sm shadow-primary/20"
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
                      <span className={`h-1.5 w-1.5 rounded-full ${stageDot[column.tone]}`} />
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
                        className="group/card rounded-md border border-zinc-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/40"
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
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-linear-to-br from-primary/20 to-secondary/20 text-[9px] font-semibold text-primary">
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    +18%
                  </span>
                  vs last month
                </span>
                <span className="hidden h-3 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
                <span className="hidden sm:inline">
                  Forecast{" "}
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    $142,800
                  </span>
                </span>
              </div>
              <div className="flex -space-x-2">
                {["JD", "AS", "KP", "MR"].map((u, i) => (
                  <span
                    key={u}
                    className={`grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[9px] font-semibold text-white dark:border-zinc-900 ${
                      i % 2 === 0
                        ? "bg-linear-to-br from-primary to-secondary"
                        : "bg-zinc-700 dark:bg-zinc-700"
                    }`}
                  >
                    {u}
                  </span>
                ))}
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-zinc-100 text-[9px] font-semibold text-zinc-600 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-300">
                  +6
                </span>
              </div>
            </div>
          </div>

          <FloatingBadge
            className="absolute -left-4 top-20 hidden lg:flex"
            icon={<FileText className="h-3.5 w-3.5 text-primary" />}
            title="AI proposal drafted"
            subtitle="Pied Piper · 12s ago"
          />
          <FloatingBadge
            className="absolute -right-4 bottom-24 hidden lg:flex"
            icon={<CreditCard className="h-3.5 w-3.5 text-emerald-500" />}
            title="Payment received"
            subtitle="Hooli · $67,000"
          />
        </div>

        <div className="mt-14 sm:mt-20">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
            Trusted by teams at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
            {customers.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold tracking-[0.15em] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
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

function FloatingBadge({
  className,
  icon,
  title,
  subtitle,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className={`items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-lg shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40 ${className ?? ""}`}
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 ring-1 ring-inset ring-primary/20">
        {icon}
      </span>
      <div className="text-left">
        <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}
