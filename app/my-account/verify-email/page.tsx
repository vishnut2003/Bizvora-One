import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import User from "@/models/user";
import VerifyEmailForm from "./_components/verify-email-form";

export const metadata: Metadata = {
  title: "Verify your email — BizvoraOne",
};

export default async function VerifyEmailPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("email emailVerified")
    .lean();
  if (!user) redirect("/login");

  // Already verified — nothing to do here.
  if (user.emailVerified) redirect("/workspace");

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
          <MailCheck className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            Security
          </p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Verify your email
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Confirm your email address to create and access workspaces.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <VerifyEmailForm email={user.email} />
      </section>
    </div>
  );
}
