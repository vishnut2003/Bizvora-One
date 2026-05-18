import type { Metadata } from "next";
import {
  ArrowUpRight,
  Briefcase,
  CircleDot,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import DashboardLayout from "@/layouts/dashboard-layout";

export const metadata: Metadata = {
  title: "Workspace — WSS CRM",
};

type WorkspaceDetailPageProps = {
  params: Promise<{ workspaceId: string }>;
};

const stats = [
  {
    label: "Pipeline value",
    value: "$211,100",
    delta: "+12%",
    trend: "up" as const,
    icon: TrendingUp,
    accent: "from-violet-500 to-purple-700",
  },
  {
    label: "Open deals",
    value: "9",
    delta: "+3",
    trend: "up" as const,
    icon: Briefcase,
    accent: "from-blue-500 to-indigo-700",
  },
  {
    label: "New contacts",
    value: "24",
    delta: "+8",
    trend: "up" as const,
    icon: Users,
    accent: "from-emerald-500 to-teal-700",
  },
  {
    label: "Win rate",
    value: "38%",
    delta: "-2%",
    trend: "down" as const,
    icon: CircleDot,
    accent: "from-amber-500 to-orange-700",
  },
];

const activity = [
  {
    who: "You",
    action: "moved",
    target: "Hooli",
    detail: "to Closing",
    when: "just now",
  },
  {
    who: "Jane Doe",
    action: "added",
    target: "Northwind Trading",
    detail: "as a contact",
    when: "2h ago",
  },
  {
    who: "Mark Reyes",
    action: "logged a call with",
    target: "Wayne Enterprises",
    detail: "",
    when: "4h ago",
  },
  {
    who: "You",
    action: "created",
    target: "Q3 Outbound",
    detail: "pipeline",
    when: "Yesterday",
  },
  {
    who: "Aarav Shah",
    action: "won",
    target: "Pied Piper",
    detail: "· $24,500",
    when: "Yesterday",
  },
];

export default async function WorkspaceDetailPage({
  params,
}: WorkspaceDetailPageProps) {
  const { workspaceId } = await params;

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              Overview
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
              Here&apos;s what&apos;s moving in{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {workspace.name}
              </span>{" "}
              this week.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-secondary px-3 text-[13px] font-medium text-white shadow-sm shadow-primary/30 transition-all hover:shadow-md hover:shadow-primary/40"
          >
            <Plus className="h-3.5 w-3.5" />
            New deal
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const up = stat.trend === "up";
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${stat.accent}`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${stat.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="relative mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
                <p
                  className={cnClass(
                    "relative mt-1 inline-flex items-center gap-1 text-[11px] font-medium",
                    up
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  <ArrowUpRight
                    className={`h-3 w-3 ${up ? "" : "rotate-90"}`}
                  />
                  {stat.delta}
                  <span className="font-normal text-zinc-500 dark:text-zinc-500">
                    vs last week
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  Recent activity
                </h2>
                <button
                  type="button"
                  className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  View all
                </button>
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {activity.map((event, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 px-5 py-3 text-[13px]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary" />
                    <div className="flex-1">
                      <p className="text-zinc-700 dark:text-zinc-300">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {event.who}
                        </span>{" "}
                        {event.action}{" "}
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {event.target}
                        </span>
                        {event.detail ? ` ${event.detail}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                      {event.when}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                Pipeline by stage
              </h2>
              <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                9 open deals
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  { label: "Qualified", count: 4, pct: 44 },
                  { label: "Proposal sent", count: 3, pct: 33 },
                  { label: "Closing", count: 2, pct: 22 },
                ].map((row) => (
                  <li key={row.label}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {row.label}
                      </span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {row.count}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function cnClass(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
