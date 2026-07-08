import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import BasicLayout from "@/layouts/basic-layout";
import Eyebrow from "@/components/eyebrow";
import { buttonClasses } from "@/components/button";
import { BRAND } from "@/content/legal/_shared";

export const metadata: Metadata = {
  title: "Blog — BizvoraOne",
  description: `The ${BRAND} blog is coming soon — playbooks, product updates, and lessons on running your whole business in one workspace.`,
};

export default function BlogsPage() {
  return (
    <BasicLayout>
      <section className="py-24 sm:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-zinc-200 bg-white text-primary dark:border-zinc-800 dark:bg-zinc-900">
              <PenLine className="h-6 w-6" />
            </span>

            <div className="mt-6">
              <Eyebrow>Coming soon</Eyebrow>
            </div>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              The {BRAND} blog is on its way.
            </h1>
            <p className="mt-5 text-balance text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              {`We're putting together playbooks, product updates, and hard-won lessons on running sales, projects, and accounts in a single workspace. Check back soon.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
    </BasicLayout>
  );
}
