import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import BasicLayout from "@/layouts/basic-layout";
import Eyebrow from "@/components/eyebrow";
import DocsCard from "@/components/docs-card";
import { getCategory } from "@/content/docs/registry";

const category = getCategory("integrations");

export const metadata: Metadata = {
  title: "Integrations — Docs — BizvoraOne",
  description:
    "Guides for connecting BizvoraOne with the tools you already use, so leads and data flow in automatically.",
};

const formatUpdated = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function IntegrationsDocsPage() {
  if (!category) notFound();

  return (
    <BasicLayout>
      <section className="border-b border-zinc-200 py-24 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-zinc-500 dark:text-zinc-400"
          >
            <Link
              href="/docs"
              className="hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Docs
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {category.title}
            </span>
          </nav>

          <div className="max-w-2xl">
            <Eyebrow>Documentation</Eyebrow>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {category.title}
            </h1>
            <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
              {category.description}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.docs.map((doc) => (
              <DocsCard
                key={doc.slug}
                href={doc.href}
                icon={category.icon}
                title={doc.title}
                description={doc.description}
                badge={doc.badge}
                meta={doc.updated ? `Updated ${formatUpdated(doc.updated)}` : undefined}
              />
            ))}
          </div>
        </div>
      </section>
    </BasicLayout>
  );
}
