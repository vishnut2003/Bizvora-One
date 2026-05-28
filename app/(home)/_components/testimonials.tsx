import Eyebrow from "@/components/eyebrow";
import { Quote, Star } from "lucide-react";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  tone: "primary" | "secondary";
};

const testimonials: Testimonial[] = [
  {
    quote:
      "We replaced three tools with BizvoraOne. Sales sees the pipeline, accounts sees the invoices, and I see the whole business — no more spreadsheets.",
    name: "Mira Ramirez",
    role: "Founder",
    company: "Northwind Trading",
    initials: "MR",
    tone: "primary",
  },
  {
    quote:
      "AI Proposals went from a curiosity to a daily habit in a week. Our turnaround on quotes dropped from two days to two minutes.",
    name: "Karthik Patel",
    role: "Sales Manager",
    company: "Acme Co.",
    initials: "KP",
    tone: "secondary",
  },
  {
    quote:
      "Per-role dashboards are the killer feature. Our accountant sees vouchers and recovery — nothing else. Sales sees deals — nothing else. It just clicks.",
    name: "Jordan Davis",
    role: "Operations Lead",
    company: "Wayne Enterprises",
    initials: "JD",
    tone: "primary",
  },
];

const toneGradient: Record<Testimonial["tone"], string> = {
  primary: "from-primary to-secondary",
  secondary: "from-secondary to-primary",
};

export default function Testimonials() {
  return (
    <section className="relative border-b border-zinc-200 bg-zinc-50/60 py-24 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Loved by teams</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Real teams. Real workspaces. Real results.
          </h2>
          <p className="mt-4 text-balance text-zinc-600 dark:text-zinc-400">
            From two-person startups to 200-person sales orgs, BizvoraOne is the
            workspace teams actually open every morning.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={t.name}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary/40 ${
                i === 1 ? "lg:translate-y-3" : ""
              }`}
            >
              <Quote
                aria-hidden
                className="absolute right-5 top-5 h-10 w-10 text-zinc-100 dark:text-zinc-800"
              />
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="relative mt-5 flex-1 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full bg-linear-to-br text-xs font-semibold text-white ${toneGradient[t.tone]}`}
                >
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {t.role} · {t.company}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
