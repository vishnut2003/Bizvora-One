import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type LegalPagesLayoutProps = {
  /** Page heading, e.g. "Privacy Policy". */
  title: string;
  /** ISO date the document was last revised, e.g. "2026-06-05". */
  updated: string;
  /** Optional one-line summary shown under the title. */
  summary?: ReactNode;
  /** Markdown body of the policy. */
  content: string;
};

const formatUpdated = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/** Turn heading text into a stable anchor id for in-page links. */
const slugify = (node: ReactNode): string =>
  String(node)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const markdownComponents = {
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      id={slugify(children)}
      className="mt-12 scroll-mt-24 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      id={slugify(children)}
      className="mt-8 scroll-mt-24 text-base font-semibold text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </h3>
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p
      className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400"
      {...props}
    />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-600 marker:text-zinc-400 dark:text-zinc-400"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-zinc-600 marker:text-zinc-400 dark:text-zinc-400"
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="pl-1" {...props} />
  ),
  a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
    const target = href ?? "#";
    const internal = target.startsWith("/") || target.startsWith("#");
    const className =
      "font-medium text-primary underline-offset-2 hover:underline";
    if (internal) {
      return (
        <Link href={target} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...props}
      >
        {children}
      </a>
    );
  },
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong
      className="font-semibold text-zinc-900 dark:text-zinc-100"
      {...props}
    />
  ),
  hr: () => (
    <hr className="my-10 border-zinc-200 dark:border-zinc-800" />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-4 border-l-2 border-primary/40 bg-primary/5 px-4 py-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.8em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="mt-6 overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        {...props}
      />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td
      className="border-b border-zinc-100 px-3 py-2 align-top text-zinc-600 dark:border-zinc-900 dark:text-zinc-400"
      {...props}
    />
  ),
};

export default function LegalPagesLayout({
  title,
  updated,
  summary,
  content,
}: LegalPagesLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <header className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {summary ? (
          <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {summary}
          </p>
        ) : null}
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
          Last updated: {formatUpdated(updated)}
        </p>
      </header>

      <div className="mt-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
