import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/logo";
import Button from "@/components/button";
import Field from "@/components/field";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sign up — WSS CRM",
  description: "Create your sales workspace in seconds. Free during beta.",
};

export default function SignupPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(142,81,255,0.10),transparent_60%),radial-gradient(40%_40%_at_85%_85%,rgba(225,42,251,0.08),transparent_60%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(142,81,255,0.18),transparent_60%),radial-gradient(40%_40%_at_85%_85%,rgba(225,42,251,0.14),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black_30%,transparent_85%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]"
      />

      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            Create your sales workspace
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Free during beta · No credit card required
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/[0.04] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30 sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="sm" className="h-10 px-3">
              <GoogleIcon />
              Google
            </Button>
            <Button variant="secondary" size="sm" className="h-10 px-3">
              <MicrosoftIcon />
              Microsoft
            </Button>
          </div>

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
            <Field
              id="workspace"
              label="Workspace name"
              placeholder="Acme Sales"
              autoComplete="organization"
              hint="You can change this anytime."
            />

            <label className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
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
              Create workspace
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </p>
      </div>
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

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M1 1h10v10H1z" fill="#F25022" />
      <path d="M13 1h10v10H13z" fill="#7FBA00" />
      <path d="M1 13h10v10H1z" fill="#00A4EF" />
      <path d="M13 13h10v10H13z" fill="#FFB900" />
    </svg>
  );
}
