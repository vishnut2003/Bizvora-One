import Link from "next/link";
import Logo from "@/components/logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Sales playbook", href: "#" },
      { label: "Help center", href: "#" },
      { label: "Integrations", href: "#" },
      { label: "API reference", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Customers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact sales", href: "#" },
    ],
  },
];

const socials = [
  {
    label: "X (Twitter)",
    href: "#",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M12.04 1.5h2.32l-5.07 5.8 5.96 7.88h-4.67l-3.66-4.78-4.19 4.78H.4l5.42-6.2L.1 1.5h4.78l3.3 4.36L12.04 1.5zm-.82 12.31h1.29L4.86 2.82H3.48l7.74 10.99z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M3.34 1.5a1.84 1.84 0 1 0 0 3.68 1.84 1.84 0 0 0 0-3.68zM1.7 6.18h3.3v8.32H1.7V6.18zM6.92 6.18h3.16v1.14h.05a3.46 3.46 0 0 1 3.12-1.4c3.34 0 3.96 2.2 3.96 5.05v4.53h-3.3v-4.02c0-.96-.02-2.2-1.34-2.2-1.34 0-1.55 1.04-1.55 2.13v4.09h-3.3V6.18z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "#",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 .5a7.5 7.5 0 0 0-2.37 14.62c.37.07.5-.16.5-.36v-1.27c-2.09.46-2.53-1-2.53-1-.34-.87-.84-1.1-.84-1.1-.68-.47.05-.46.05-.46.76.05 1.16.78 1.16.78.67 1.15 1.76.82 2.19.63.07-.49.26-.82.48-1.01-1.67-.19-3.43-.84-3.43-3.72 0-.82.3-1.5.78-2.02-.08-.19-.34-.96.07-2 0 0 .63-.2 2.07.77a7.2 7.2 0 0 1 3.78 0c1.44-.97 2.07-.77 2.07-.77.41 1.04.15 1.81.07 2 .48.52.78 1.2.78 2.02 0 2.89-1.77 3.53-3.45 3.71.27.23.51.69.51 1.4v2.08c0 .2.13.44.51.36A7.5 7.5 0 0 0 8 .5z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
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
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-zinc-500 sm:flex-row dark:text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Web Spider Solutions. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">
              Terms
            </a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">
              Security
            </a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-300">
              Cookies
            </a>
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
