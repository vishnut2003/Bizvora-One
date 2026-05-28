import { redirect } from "next/navigation";
import { CheckCircle2, User as UserIcon } from "lucide-react";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import User from "@/models/user";
import type { AuthProvider } from "@/lib/user";
import NameForm from "./_components/name-form";
import PasswordForm from "./_components/password-form";
import GoogleConnection from "./_components/google-connection";

type LeanUser = {
  name: string;
  email: string;
  image: string | null;
  providers: AuthProvider[];
  googleId: string | null;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { linked } = await searchParams;

  await connectDB();
  const user = (await User.findById(session.user.id)
    .select("name email image providers googleId")
    .lean()) as LeanUser | null;
  if (!user) redirect("/login");

  const initial = user.name.charAt(0).toUpperCase() || "?";
  const hasPassword = user.providers?.includes("credentials") ?? false;
  const hasGoogle = user.providers?.includes("google") ?? false;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-14 shrink-0 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800"
          />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-xl font-semibold text-white shadow-md shadow-primary/30">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            Profile
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            {user.name}
          </h1>
          <p className="mt-1 truncate text-[13px] text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
        </div>
      </div>

      {linked === "google" ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-[12px] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          Google account connected.
        </div>
      ) : null}

      <Card title="Your name" icon={<UserIcon className="h-4 w-4" />}>
        <NameForm defaultValue={user.name} />
      </Card>

      <Card title="Email">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {user.email}
          </span>
          <span className="text-[11px] text-zinc-500">
            Contact support to change your email
          </span>
        </div>
      </Card>

      <Card title={hasPassword ? "Change password" : "Set a password"}>
        <PasswordForm hasCredentials={hasPassword} />
      </Card>

      <Card title="Connected accounts">
        <GoogleConnection
          connected={hasGoogle}
          canUnlink={hasPassword}
          googleId={user.googleId}
        />
      </Card>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
        {icon ? (
          <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>
        ) : null}
        <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}
