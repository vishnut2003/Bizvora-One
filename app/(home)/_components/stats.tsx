import Eyebrow from "@/components/eyebrow";
import { Clock, TrendingDown, TrendingUp, Zap } from "lucide-react";

const stats = [
  {
    label: "Faster proposal turnaround",
    value: "8×",
    sub: "AI-drafted in seconds, not days",
    icon: <Zap className="h-4 w-4" />,
    trend: "up" as const,
  },
  {
    label: "Pipeline visibility",
    value: "100%",
    sub: "Every deal, every owner, every stage",
    icon: <TrendingUp className="h-4 w-4" />,
    trend: "up" as const,
  },
  {
    label: "Tool sprawl, gone",
    value: "−6",
    sub: "Replace your CRM, PM, and accounts apps",
    icon: <TrendingDown className="h-4 w-4" />,
    trend: "down" as const,
  },
  {
    label: "Time to first deal",
    value: "<1 min",
    sub: "Sign up and start selling right away",
    icon: <Clock className="h-4 w-4" />,
    trend: "up" as const,
  },
];

export default function Stats() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 py-24 dark:border-zinc-800">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(142,81,255,0.08),transparent_70%)] dark:bg-[radial-gradient(60%_60%_at_50%_50%,rgba(142,81,255,0.14),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why teams switch</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            One workspace replaces a stack of tools.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            Less context switching, fewer integrations, lower bills — and a
            clearer picture of the business.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-primary/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  {s.icon}
                </span>
                <span
                  className={`inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold ${
                    s.trend === "up"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {s.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {s.trend === "up" ? "Up" : "Down"}
                </span>
              </div>
              <p className="mt-6 text-4xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {s.value}
                </span>
              </p>
              <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {s.label}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
