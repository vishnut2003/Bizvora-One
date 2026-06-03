import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import Eyebrow from "@/components/eyebrow";
import { ShieldCheck } from "lucide-react";
import ForgotPasswordForm from "./_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password — BizvoraOne",
  description: "Reset your BizvoraOne account password.",
};

const highlights = [
  {
    title: "Secure, time-limited codes",
    body: "Reset codes expire quickly and can only be used once.",
  },
  {
    title: "Back in minutes",
    body: "Verify your email, enter the code, and set a new password.",
  },
  {
    title: "Your data stays yours",
    body: "We never ask for your password over email or phone.",
  },
];

export default function ForgotPasswordPage() {
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
          <Eyebrow>Account recovery</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Let&apos;s get you{" "}
            <span className="text-primary">back into your workspace.</span>
          </h2>
          <p className="mt-4 max-w-md text-balance text-zinc-600 dark:text-zinc-400">
            Reset your password in three quick steps. We&apos;ll email you a
            secure code to verify it&apos;s really you.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map((h) => (
              <li key={h.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {h.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {h.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-12 pb-12">
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              For your security, reset codes expire after 10 minutes and stop
              working once used.
            </p>
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
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Remembered it?{" "}
              <Link
                href="/login"
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                Back to sign in
              </Link>
            </p>
          </div>

          <Suspense>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
