import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type DocsBreadcrumb = {
  label: string;
  /** Omit for the current page (rendered as plain text). */
  href?: string;
};

type DocsLayoutProps = {
  /** Page heading, e.g. "Connect Meta Ads with BizvoraOne". */
  title: string;
  /** Optional one-line summary shown under the title. */
  description?: ReactNode;
  /** ISO date the doc was last revised, e.g. "2026-07-02". */
  updated?: string;
  /** Trail shown above the title, e.g. Docs → Integrations → This page. */
  breadcrumbs?: DocsBreadcrumb[];
  /** Markdown body of the doc. */
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
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const nodeToText = (node: ReactNode): string => String(node);

/** Extract `##` headings from the markdown for the "On this page" list. */
const extractToc = (markdown: string): Array<{ id: string; label: string }> =>
  markdown
    .split("\n")
    .filter((line) => /^##\s+/.test(line))
    .map((line) => {
      const label = line.replace(/^##\s+/, "").trim();
      return { id: slugify(label), label };
    });

const markdownComponents = {
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      id={slugify(nodeToText(children))}
      className="mt-12 scroll-mt-24 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      id={slugify(nodeToText(children))}
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
  hr: () => <hr className="my-10 border-zinc-200 dark:border-zinc-800" />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-4 border-l-2 border-primary/40 bg-primary/5 px-4 py-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300 [&>p]:mt-0"
      {...props}
    />
  ),
  // Fenced code blocks (```); inline `code` keeps the pill style below.
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-[12.5px] leading-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 [&_code]:bg-transparent [&_code]:p-0"
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
      <table className="w-full border-collapse text-left text-sm" {...props} />
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

export default function DocsLayout({
  title,
  description,
  updated,
  breadcrumbs = [],
  content,
}: DocsLayoutProps) {
  const toc = extractToc(content);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="lg:flex lg:gap-12">
        <article className="min-w-0 flex-1 lg:max-w-3xl">
          {breadcrumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-zinc-500 dark:text-zinc-400"
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 ? (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}

          <header className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
            {updated ? (
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                Last updated: {formatUpdated(updated)}
              </p>
            ) : null}
          </header>

          {/* Mobile "On this page" — the sidebar version is hidden below lg */}
          {toc.length > 1 ? (
            <nav
              aria-label="On this page"
              className="mt-8 rounded-xl border border-zinc-200 p-4 lg:hidden dark:border-zinc-800"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                On this page
              </p>
              <ul className="mt-2.5 space-y-1.5 text-[13px]">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-zinc-600 hover:text-primary dark:text-zinc-400"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="mt-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>

        {toc.length > 1 ? (
          <aside className="hidden lg:block lg:w-56 lg:shrink-0">
            <nav
              aria-label="On this page"
              className="sticky top-24 border-l border-zinc-200 pl-5 dark:border-zinc-800"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                On this page
              </p>
              <ul className="mt-3 space-y-2 text-[13px]">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block leading-snug text-zinc-600 hover:text-primary dark:text-zinc-400"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
