import Link from "next/link";

const benefits = [
  "Free during beta",
  "No credit card required",
  "Cancel anytime",
];

export default function Cta() {
  return (
    <section id="pricing" className="relative overflow-hidden py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(142,81,255,0.10),transparent_70%),radial-gradient(40%_40%_at_85%_30%,rgba(225,42,251,0.08),transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_50%,rgba(142,81,255,0.16),transparent_70%),radial-gradient(40%_40%_at_85%_30%,rgba(225,42,251,0.12),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-primary/40 via-transparent to-secondary/40 opacity-60 blur-sm"
          />

          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-10 sm:p-14 dark:border-zinc-800 dark:bg-zinc-900">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black_20%,transparent_80%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]"
            />

            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Get started
              </span>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-white">
                Build your sales workspace in{" "}
                <span className="text-primary">under a minute</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-balance text-zinc-600 dark:text-zinc-400">
                Bring your team, your contacts, and your pipeline. We&apos;ll get out of
                the way so you can get back to closing.
              </p>

              <ul className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {benefits.map((b) => (
                  <li key={b} className="inline-flex items-center gap-2">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-primary">
                      <svg
                        className="h-2.5 w-2.5"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M2 6.5l2.5 2.5L10 3.5" />
                      </svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-6 text-sm font-medium text-white shadow-sm shadow-primary/25 transition-all hover:shadow-md hover:shadow-primary/35 sm:w-auto"
                >
                  Start your workspace
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 sm:w-auto dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
