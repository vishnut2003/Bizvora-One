import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/logo";
import Button from "@/components/button";
import Field from "@/components/field";
import Eyebrow from "@/components/eyebrow";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sign up — WSS CRM",
  description: "Create your sales workspace in seconds. Free during beta.",
};

const benefits = [
  {
    title: "Built for sales",
    body: "Pipelines, contacts, and follow-ups — designed around how teams actually sell.",
  },
  {
    title: "Set up in under a minute",
    body: "Pick a starting template, invite teammates, import contacts — done.",
  },
  {
    title: "Free during beta",
    body: "No credit card required. Bring your data and try it end-to-end.",
  },
];

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="relative hidden overflow-hidden border-r border-zinc-200 bg-zinc-50/60 lg:flex lg:w-[45%] lg:flex-col lg:justify-between dark:border-zinc-800 dark:bg-zinc-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_30%_0%,rgba(142,81,255,0.18),transparent_70%),radial-gradient(60%_50%_at_80%_100%,rgba(225,42,251,0.16),transparent_70%)] dark:bg-[radial-gradient(70%_50%_at_30%_0%,rgba(142,81,255,0.30),transparent_70%),radial-gradient(60%_50%_at_80%_100%,rgba(225,42,251,0.24),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black_30%,transparent_85%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-32 -z-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-24 -z-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl"
        />

        <div className="px-12 pt-14">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>
        </div>

        <div className="px-12">
          <Eyebrow>Start your trial</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Run your sales pipeline.{" "}
            <span className="text-primary">Not your CRM.</span>
          </h2>
          <p className="mt-4 max-w-md text-balance text-zinc-600 dark:text-zinc-400">
            Spin up a workspace, drop in your team and contacts, and start closing — all
            in one focused tool.
          </p>

          <ul className="mt-10 space-y-5">
            {benefits.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {b.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {b.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-12 pb-12">
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-semibold text-white">
                JD
              </span>
              <div>
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  &ldquo;We replaced our legacy CRM in two days. The team actually uses
                  this one — that&apos;s the whole game.&rdquo;
                </p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Jane Doe
                  </span>{" "}
                  · Head of Sales, Acme Co.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="inline-block lg:hidden">
            <Logo />
          </Link>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Already have one?{" "}
              <Link
                href="/login"
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                Sign in
              </Link>
            </p>
          </div>

          <Button variant="secondary" size="sm" className="mt-8 h-10 w-full px-3">
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="uppercase tracking-wider">or with email</span>
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="space-y-4">
            <Field id="name" label="Full name" placeholder="Jane Doe" autoComplete="name" />
            <Field
              id="email"
              label="Work email"
              type="email"
              placeholder="jane@acme.co"
              autoComplete="email"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              hint="Use 8+ characters with a mix of letters and numbers."
            />

            <label className="flex items-start gap-2.5 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span>
                I agree to the{" "}
                <a
                  href="#"
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <Button variant="primary" size="md" className="mt-2 w-full">
              Continue
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>

            <p className="pt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-500">
              Protected by industry-standard encryption. Your data stays yours.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.95l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

