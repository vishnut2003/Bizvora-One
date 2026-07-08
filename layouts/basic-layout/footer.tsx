import Link from "next/link";
import Logo from "@/components/logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Modules", href: "/#modules" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Help center", href: "/help" },
      { label: "Integrations", href: "/docs/integrations" },
      { label: "Contact support", href: "mailto:support@bizvoraone.com" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blogs" },
      { label: "Careers", href: "/careers" },
      { label: "Contact sales", href: "mailto:support@bizvoraone.com" },
    ],
  },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Cookies", href: "/cookies" },
  { label: "Sub-processors", href: "/subprocessors" },
  { label: "DPA", href: "/dpa" },
  { label: "Acceptable Use", href: "/acceptable-use" },
  { label: "AI Disclosure", href: "/ai-disclosure" },
];

const socials = [
  {
    label: "X (Twitter)",
    href: "https://x.com/InfoWebspider",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M12.04 1.5h2.32l-5.07 5.8 5.96 7.88h-4.67l-3.66-4.78-4.19 4.78H.4l5.42-6.2L.1 1.5h4.78l3.3 4.36L12.04 1.5zm-.82 12.31h1.29L4.86 2.82H3.48l7.74 10.99z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/web-spider-solutions/",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M3.34 1.5a1.84 1.84 0 1 0 0 3.68 1.84 1.84 0 0 0 0-3.68zM1.7 6.18h3.3v8.32H1.7V6.18zM6.92 6.18h3.16v1.14h.05a3.46 3.46 0 0 1 3.12-1.4c3.34 0 3.96 2.2 3.96 5.05v4.53h-3.3v-4.02c0-.96-.02-2.2-1.34-2.2-1.34 0-1.55 1.04-1.55 2.13v4.09h-3.3V6.18z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/webspidersolutions/",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 1.44c2.14 0 2.39.01 3.23.05.78.04 1.2.17 1.49.28.37.15.64.32.92.6.28.28.45.55.6.92.11.28.24.71.28 1.49.04.84.05 1.09.05 3.22s-.01 2.39-.05 3.23c-.04.78-.17 1.2-.28 1.49-.15.37-.32.64-.6.92-.28.28-.55.45-.92.6-.28.11-.71.24-1.49.28-.84.04-1.09.05-3.23.05s-2.39-.01-3.23-.05c-.78-.04-1.2-.17-1.49-.28a2.48 2.48 0 0 1-.92-.6 2.48 2.48 0 0 1-.6-.92c-.11-.28-.24-.71-.28-1.49C1.45 10.39 1.44 10.14 1.44 8s.01-2.38.05-3.22c.04-.78.17-1.21.28-1.49.15-.37.32-.64.6-.92.28-.28.55-.45.92-.6.29-.11.71-.24 1.49-.28C5.62 1.45 5.87 1.44 8 1.44zm0 3.53a3.03 3.03 0 1 0 0 6.06 3.03 3.03 0 0 0 0-6.06zm0 5a1.97 1.97 0 1 1 0-3.94 1.97 1.97 0 0 1 0 3.94zm3.86-5.12a.71.71 0 1 1-1.42 0 .71.71 0 0 1 1.42 0z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/webspidersolutions1",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M15 8a7 7 0 1 0-8.09 6.92v-4.9H5.13V8h1.78V6.46c0-1.76 1.05-2.73 2.65-2.73.77 0 1.57.14 1.57.14v1.72h-.89c-.87 0-1.14.54-1.14 1.1V8h1.95l-.31 2.02H9.09v4.9A7 7 0 0 0 15 8z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@webspidersolutions",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M15.32 4.5a1.9 1.9 0 0 0-1.34-1.34C12.78 2.83 8 2.83 8 2.83s-4.78 0-5.98.33A1.9 1.9 0 0 0 .68 4.5C.35 5.7.35 8 .35 8s0 2.3.33 3.5a1.9 1.9 0 0 0 1.34 1.34c1.2.33 5.98.33 5.98.33s4.78 0 5.98-.33a1.9 1.9 0 0 0 1.34-1.34c.33-1.2.33-3.5.33-3.5s0-2.3-.33-3.5zM6.5 10.3V5.7l3.96 2.3-3.96 2.3z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-12">
          <div className="col-span-2 lg:col-span-4">
            <Link href="/" className="inline-block">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              The sales CRM your team will actually use. Pipelines, contacts, and
              follow-ups — without the bloat.
            </p>

            <div className="mt-6 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-primary/10"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-900 dark:text-zinc-100">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-900 dark:text-zinc-100">
              Get started
            </h3>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Ready to close more deals? Spin up your workspace in minutes.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Start Now
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-6 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center dark:text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Web Spider Solutions. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-zinc-900 dark:hover:text-zinc-300"
              >
                {link.label}
              </Link>
            ))}
            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-500">
              <span className="relative grid h-2 w-2 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              All systems normal
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
