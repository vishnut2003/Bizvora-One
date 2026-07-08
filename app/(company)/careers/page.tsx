import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import BasicLayout from "@/layouts/basic-layout";
import Eyebrow from "@/components/eyebrow";
import { buttonClasses } from "@/components/button";
import { BRAND, CONTACT } from "@/content/legal/_shared";

export const metadata: Metadata = {
  title: "Careers — BizvoraOne",
  description: `We're not hiring just yet — but we're building ${BRAND} and will be soon. Check back for open roles.`,
};

export default function CareersPage() {
  return (
    <BasicLayout>
      <section className="py-24 sm:py-32">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-zinc-200 bg-white text-primary dark:border-zinc-800 dark:bg-zinc-900">
              <Briefcase className="h-6 w-6" />
            </span>

            <div className="mt-6">
              <Eyebrow>Coming soon</Eyebrow>
            </div>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Come build {BRAND} with us.
            </h1>
            <p className="mt-5 text-balance text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              {`We don't have open roles listed just yet, but we're growing the team behind ${BRAND}. Check back soon — or reach out and tell us how you'd like to help.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`mailto:${CONTACT.supportEmail}`}
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Get in touch
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                href="/about"
                className={buttonClasses({ variant: "secondary", size: "md" })}
              >
                About us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </BasicLayout>
  );
}
