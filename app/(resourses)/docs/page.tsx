import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import Eyebrow from "@/components/eyebrow";
import DocsCard from "@/components/docs-card";
import { docsCategories } from "@/content/docs/registry";

export const metadata: Metadata = {
  title: "Documentation — BizvoraOne",
  description:
    "Guides and references for BizvoraOne — browse documentation by category to set up integrations and get the most out of your CRM.",
};

export default function DocsPage() {
  return (
    <BasicLayout>
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            <Eyebrow>Documentation</Eyebrow>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to get the most out of BizvoraOne.
            </h1>
            <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
              Browse the docs by category. We&apos;re adding more guides as the
              product grows — pick a topic to dive in.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docsCategories.map((category) => (
              <DocsCard
                key={category.id}
                href={category.href}
                icon={category.icon}
                title={category.title}
                description={category.description}
                meta={`${category.docs.length} ${
                  category.docs.length === 1 ? "guide" : "guides"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </BasicLayout>
  );
}
