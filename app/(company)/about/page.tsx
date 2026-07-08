import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Boxes,
  Bot,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import BasicLayout from "@/layouts/basic-layout";
import Eyebrow from "@/components/eyebrow";
import { buttonClasses } from "@/components/button";
import Stats from "@/app/(home)/_components/stats";
import Testimonials from "@/app/(home)/_components/testimonials";
import Cta from "@/app/(home)/_components/cta";
import {
  BRAND,
  LEGAL_ENTITY,
  PRODUCT_DESC,
  OPERATOR_NOTE,
  CONTACT,
} from "@/content/legal/_shared";

export const metadata: Metadata = {
  title: "About — BizvoraOne",
  description: `${BRAND} is ${PRODUCT_DESC}. Learn what we're building and who's behind it.`,
};

type Value = {
  title: string;
  description: string;
  icon: ReactNode;
};

const values: Value[] = [
  {
    title: "One workspace, not a stack",
    description:
      "Sales, projects, accounts, and HR belong together. We replace a shelf of disconnected tools with a single place your whole company can work.",
    icon: <Boxes className="h-5 w-5" />,
  },
  {
    title: "Every role gets their own view",
    description:
      "A salesperson and an accountant need different things. Per-role dashboards show each person exactly what matters to them — and nothing else.",
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    title: "Your data stays yours",
    description:
      "Every record is scoped to your workspace at the data layer, with access checks on every request. Your business data is isolated and yours.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "AI does the busywork",
    description:
      "Drafting proposals and quotes shouldn't take days. We put AI where it saves real time, so your team can get back to selling and delivering.",
    icon: <Bot className="h-5 w-5" />,
  },
];

export default function AboutPage() {
  return (
    <BasicLayout>
      {/* Hero */}
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-3xl">
            <Eyebrow>About us</Eyebrow>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              One workspace for sales, projects &amp; accounts.
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              {`${BRAND} unifies your customers, deals, proposals, projects, vouchers, and team — in a single workspace your whole company can use.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Start your workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs"
                className={buttonClasses({ variant: "secondary", size: "md" })}
              >
                Explore the docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Our mission</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Run your whole business in one place.
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-2xl space-y-5 text-base leading-8 text-zinc-600 dark:text-zinc-400">
            <p>
              {`Most teams stitch their day together across a CRM, a project tracker, an accounting tool, and a pile of spreadsheets — then spend their time copying data between them. ${BRAND} exists to end that. It's ${PRODUCT_DESC}, wired together so a lead can become a customer, a project, an invoice, and a payment without ever leaving your workspace.`}
            </p>
            <p>
              {`We build for the whole company, not just one department — with built-in roles so sales, accounts, projects, and HR each get a view that fits how they actually work. ${BRAND} is built and operated by ${LEGAL_ENTITY}.`}
            </p>
          </div>
        </div>
      </section>

      {/* By the numbers (reused) */}
      <Stats />

      {/* Values */}
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>What we believe</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              The principles behind the product.
            </h2>
            <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
              A few convictions that shape every decision we make about {BRAND}.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <article
                key={value.title}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-primary/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/40"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-linear-to-br from-primary/15 to-secondary/15 text-primary ring-1 ring-inset ring-primary/20">
                    {value.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {value.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Loved by teams (reused) */}
      <Testimonials />

      {/* The company behind BizvoraOne */}
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Who&apos;s behind it</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              The company behind {BRAND}.
            </h2>
          </div>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              {OPERATOR_NOTE}
            </p>
            <dl className="mt-8 grid grid-cols-1 gap-6 border-t border-zinc-200 pt-8 sm:grid-cols-2 dark:border-zinc-800">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                  Registered entity
                </dt>
                <dd className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
                  {LEGAL_ENTITY}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                  Get in touch
                </dt>
                <dd className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
                  <a
                    href={`mailto:${CONTACT.supportEmail}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {CONTACT.supportEmail}
                  </a>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                  Registered address
                </dt>
                <dd className="mt-2 text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                  {CONTACT.registeredAddress}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Closing CTA (reused) */}
      <Cta />
    </BasicLayout>
  );
}
