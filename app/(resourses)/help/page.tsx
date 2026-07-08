import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import BasicLayout from "@/layouts/basic-layout";
import Eyebrow from "@/components/eyebrow";
import DocsCard from "@/components/docs-card";
import FaqAccordion from "@/components/faq-accordion";
import { buttonClasses } from "@/components/button";
import { CONTACT } from "@/content/legal/_shared";
import { helpFaqs, helpTopics } from "@/content/help/help-content";

export const metadata: Metadata = {
  title: "Help center — BizvoraOne",
  description:
    "Get help with BizvoraOne — browse support topics, find answers to common questions, and reach our team.",
};

export default function HelpPage() {
  return (
    <BasicLayout>
      {/* Header + topics */}
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            <Eyebrow>Help center</Eyebrow>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              How can we help?
            </h1>
            <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
              Browse a topic, scan the common questions below, or reach out —
              we&apos;re happy to help you get the most out of your workspace.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {helpTopics.map((topic) => (
              <DocsCard
                key={topic.title}
                href={topic.href}
                icon={topic.icon}
                title={topic.title}
                description={topic.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-b border-zinc-200 py-24 dark:border-zinc-800"
      >
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Common questions.
            </h2>
            <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
              Quick answers to the things people ask us most.
            </p>
          </div>

          <div className="mt-14">
            <FaqAccordion items={helpFaqs} />
          </div>
        </div>
      </section>

      {/* Contact support */}
      <section className="py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 opacity-70 blur-3xl"
            />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                  Still need help?
                </h2>
                <p className="mt-3 text-balance text-zinc-600 dark:text-zinc-400">
                  Our team is happy to help. Email us at{" "}
                  <a
                    href={`mailto:${CONTACT.supportEmail}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {CONTACT.supportEmail}
                  </a>{" "}
                  and we&apos;ll get back to you.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <a
                  href={`mailto:${CONTACT.supportEmail}`}
                  className={buttonClasses({ variant: "primary", size: "md" })}
                >
                  Email support
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <Link
                  href="/docs"
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                >
                  Browse docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </BasicLayout>
  );
}
