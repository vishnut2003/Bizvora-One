import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import { buttonClasses } from "@/components/button";
import { ArrowRight, Check, Sparkles } from "lucide-react";

// Every plan unlocks the entire platform — there are no locked modules.
const features: string[] = [
  "Customers & CRM with full activity history",
  "Leads & drag-and-drop pipeline",
  "AI Proposals & Quotations with PDF export",
  "Projects, tasks, milestones & calendar",
  "Sales orders, invoices, receipts & payments",
  "Purchase orders, invoices & vendors",
  "Payment recovery tracking",
  "HR & employee management",
  "8 built-in roles with granular access",
  "Multiple isolated workspaces",
  "Audit log on every voucher",
  "Priority support",
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-b border-zinc-200 py-24 dark:border-zinc-800"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(142,81,255,0.10),transparent_70%)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(142,81,255,0.16),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            One plan. Every feature.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            No tiers, no locked modules — the entire platform for your whole
            team. Get in touch and we&apos;ll tailor a plan to your team size.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-md">
          <div className="relative flex flex-col rounded-2xl border border-primary/40 bg-white p-7 shadow-xl shadow-primary/10 dark:border-primary/50 dark:bg-zinc-900">
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-linear-to-br from-primary/30 via-transparent to-secondary/30 opacity-60 blur"
            />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                BizvoraOne
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                <Sparkles className="h-2.5 w-2.5" />
                All-in-one
              </span>
            </div>

            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Everything you need to run sales, projects, accounts, and HR in a
              single workspace.
            </p>

            <Link
              href="/signup"
              className={buttonClasses({
                variant: "primary",
                size: "sm",
                className: "mt-6 w-full",
              })}
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <p className="mt-7 border-t border-zinc-200 pt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
              Everything included
            </p>
            <ul className="mt-4 space-y-3">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Questions about pricing?{" "}
          <Link href="mailto:info@bizvoraone.com" className="text-primary">
            Contact us
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
