import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import type { WorkspaceColor, WorkspaceStatus } from "@/lib/workspace";
import type { UserRole } from "@/models/user";
import { LogOut } from "lucide-react";
import WorkspaceCard, {
  type WorkspaceCardData,
} from "./_components/workspace-card";
import CreateWorkspaceCard from "./_components/create-workspace-card";

export const metadata: Metadata = {
  title: "Choose a workspace — BizvoraOne",
};

async function getWorkspaces(userId: string): Promise<WorkspaceCardData[]> {
  await connectDB();
  const docs = await Workspace.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  return docs.map((w) => {
    const isOwner = String(w.owner) === userId;
    const membership = w.members?.find((m) => String(m.user) === userId);
    const role: UserRole = isOwner
      ? "owner"
      : (membership?.role ?? "sales_executive");

    return {
      id: String(w._id),
      name: w.name,
      color: w.color as WorkspaceColor,
      status: (w.status as WorkspaceStatus | undefined) ?? "active",
      memberCount: w.members?.length ?? 0,
      role,
      updatedAt: (w.updatedAt as Date).toISOString(),
    };
  });
}

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaces = await getWorkspaces(session.user.id);
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="relative isolate flex min-h-screen flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-20%] h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px] dark:bg-primary/15" />
        <div className="absolute bottom-[-30%] left-[15%] h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-[140px] dark:bg-secondary/15" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_30%,black_30%,transparent_85%)] dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_30%,black_30%,transparent_85%)] dark:block"
      />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex items-baseline text-[18px] font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Bizvora
          </span>
          <span className="ml-1.5 text-zinc-900 dark:text-white">One</span>
          <span
            aria-hidden
            className="ml-1 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-gradient-to-br from-primary to-secondary"
          />
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="group inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/80 px-3 py-1.5 text-[12px] text-zinc-700 backdrop-blur-sm transition-all hover:border-zinc-300 hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-5 w-5 rounded-full ring-1 ring-zinc-200 dark:ring-white/20"
              />
            ) : (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[10px] font-semibold text-white">
                {firstName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden sm:inline">
              {session.user.email ?? session.user.name}
            </span>
            <span className="mx-1 hidden h-3 w-px bg-zinc-200 dark:bg-white/15 sm:inline-block" />
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-[440px]">
          <div
            aria-hidden
            className="absolute -inset-px -z-10 hidden rounded-2xl bg-gradient-to-b from-white/20 via-white/5 to-transparent dark:block"
          />
          <div className="relative rounded-2xl bg-white p-7 shadow-xl shadow-zinc-900/[0.06] ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] dark:ring-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              Workspaces
            </p>

            <h1 className="mt-3 text-[22px] font-semibold leading-[1.15] tracking-[-0.01em] text-zinc-900 dark:text-white">
              Choose a workspace
            </h1>
            <p className="mt-1.5 max-w-[36ch] text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {workspaces.length === 0
                ? "Set up your first workspace to organize contacts, deals, and pipelines."
                : "Continue where you left off, or create a new one for a fresh team."}
            </p>

            {workspaces.length > 0 ? (
              <>
                <div className="my-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                  Your workspaces
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                </div>

                <div className="-my-1 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {workspaces.map((w) => (
                    <div key={w.id} className="py-1">
                      <WorkspaceCard workspace={w} />
                    </div>
                  ))}
                </div>

                <div className="mt-5 h-px bg-zinc-100 dark:bg-zinc-800" />
              </>
            ) : null}

            <div className="mt-5">
              <CreateWorkspaceCard />
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-zinc-500 dark:text-zinc-500">
            Need to sign in with a different account?{" "}
            <span className="text-zinc-400 dark:text-zinc-600">
              Use the menu above.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
