import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  Magnet,
  Plug,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import User from "@/models/user";
import Lead from "@/models/lead";
import Customer from "@/models/customer";
import Integration from "@/models/integration";
import { timeAgo } from "@/lib/time";
import {
  WORKSPACE_STATUSES,
  WORKSPACE_STATUS_LABEL,
  type WorkspaceColor,
  type WorkspaceStatus,
} from "@/lib/workspace";

const swatch: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

// Bar/legend fill per workspace status, aligned with the badge palette.
const STATUS_BAR: Record<WorkspaceStatus, string> = {
  active: "bg-emerald-500",
  pending_payment: "bg-amber-500",
  suspended: "bg-zinc-400 dark:bg-zinc-500",
  rejected: "bg-rose-500",
};

type Overview = {
  workspaceTotal: number;
  statusCounts: Record<WorkspaceStatus, number>;
  userTotal: number;
  disabledUsers: number;
  leadTotal: number;
  customerTotal: number;
  integrationsActive: number;
  integrationLeads: number;
  pending: {
    id: string;
    name: string;
    color: WorkspaceColor;
    ownerName: string;
    createdAt: string;
  }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
  }[];
};

async function getOverview(): Promise<Overview> {
  await connectDB();

  const [
    statusAgg,
    userTotal,
    disabledUsers,
    leadTotal,
    customerTotal,
    integrationAgg,
    pendingDocs,
    recentUserDocs,
  ] = await Promise.all([
    Workspace.aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    User.countDocuments({}),
    User.countDocuments({ disabled: true }),
    Lead.countDocuments({}),
    Customer.countDocuments({}),
    Integration.aggregate<{ active: number; leads: number }>([
      {
        $group: {
          _id: null,
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          leads: { $sum: "$totalLeadsReceived" },
        },
      },
    ]),
    Workspace.find({ status: "pending_payment" })
      .populate<{ owner: { name?: string } | null }>("owner", "name")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    User.find({}).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const statusCounts = {
    pending_payment: 0,
    active: 0,
    rejected: 0,
    suspended: 0,
  } as Record<WorkspaceStatus, number>;
  for (const row of statusAgg) {
    // Legacy docs without a status field group under null → treat as active.
    const key = (row._id ?? "active") as WorkspaceStatus;
    if (key in statusCounts) statusCounts[key] += row.count;
  }
  const workspaceTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return {
    workspaceTotal,
    statusCounts,
    userTotal,
    disabledUsers,
    leadTotal,
    customerTotal,
    integrationsActive: integrationAgg[0]?.active ?? 0,
    integrationLeads: integrationAgg[0]?.leads ?? 0,
    pending: pendingDocs.map((w) => ({
      id: String(w._id),
      name: w.name,
      color: w.color as WorkspaceColor,
      ownerName: w.owner?.name ?? "Unknown",
      createdAt: (w.createdAt as Date).toISOString(),
    })),
    recentUsers: recentUserDocs.map((u) => ({
      id: String(u._id),
      name: u.name ?? "",
      email: u.email,
      image: u.image ?? null,
      createdAt: (u.createdAt as Date).toISOString(),
    })),
  };
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const inner = (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-primary/40 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30">
          <Icon className="h-4 w-4" />
        </span>
        {href ? (
          <ArrowRight className="h-4 w-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary dark:text-zinc-600" />
        ) : null}
      </div>
      <p className="mt-4 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-zinc-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="mt-1.5 text-[12px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      {hint ? (
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function AdminDashboardPage() {
  const [session, data] = await Promise.all([auth(), getOverview()]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.14] dark:via-zinc-900 dark:to-secondary/[0.10]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start gap-3.5 p-6">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
            />
            <ShieldCheck className="relative h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              Platform admin
            </p>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Overview
            </h1>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
              Signed in as{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {session?.user?.email}
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Workspaces"
          value={data.workspaceTotal}
          icon={Building2}
          href="/admin/workspaces"
          hint={
            data.statusCounts.pending_payment > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {data.statusCounts.pending_payment} awaiting review
              </span>
            ) : (
              "All reviewed"
            )
          }
        />
        <StatCard
          label="Users"
          value={data.userTotal}
          icon={Users}
          href="/admin/users"
          hint={
            data.disabledUsers > 0 ? (
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {data.disabledUsers} disabled
              </span>
            ) : (
              "All active"
            )
          }
        />
        <StatCard
          label="Leads"
          value={data.leadTotal}
          icon={Magnet}
          hint={
            <span className="inline-flex items-center gap-1">
              <Plug className="h-3 w-3" />
              {data.integrationLeads.toLocaleString()} via integrations
            </span>
          }
        />
        <StatCard
          label="Customers"
          value={data.customerTotal}
          icon={UserCheck}
          hint={`${data.integrationsActive} active integration${data.integrationsActive === 1 ? "" : "s"}`}
        />
      </div>

      {/* Workspace status distribution */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
          Workspace status
        </h2>
        {data.workspaceTotal === 0 ? (
          <p className="mt-3 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            No workspaces yet.
          </p>
        ) : (
          <>
            <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {WORKSPACE_STATUSES.map((s) =>
                data.statusCounts[s] > 0 ? (
                  <div
                    key={s}
                    className={STATUS_BAR[s]}
                    style={{
                      width: `${(data.statusCounts[s] / data.workspaceTotal) * 100}%`,
                    }}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {WORKSPACE_STATUSES.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-400"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_BAR[s]}`}
                    aria-hidden
                  />
                  {WORKSPACE_STATUS_LABEL[s]}
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {data.statusCounts[s]}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Two-column: pending approvals + recent signups */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Awaiting review */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
              <Clock className="h-4 w-4 text-amber-500" />
              Awaiting review
            </h2>
            <Link
              href="/admin/workspaces"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.pending.length === 0 ? (
            <div className="grid flex-1 place-items-center px-5 py-10 text-center">
              <Clock className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                Nothing pending. New workspaces will show up here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.pending.map((w) => (
                <Link
                  key={w.id}
                  href="/admin/workspaces"
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12px] font-semibold text-white ${swatch[w.color]}`}
                  >
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                      {w.name}
                    </p>
                    <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                      {w.ownerName} · {timeAgo(w.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
              <Users className="h-4 w-4 text-primary" />
              Recent signups
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentUsers.length === 0 ? (
            <div className="grid flex-1 place-items-center px-5 py-10 text-center">
              <Users className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                No users yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 shrink-0 rounded-full ring-1 ring-zinc-200 dark:ring-white/10"
                    />
                  ) : (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[12px] font-semibold text-white">
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                      {u.name || u.email}
                    </p>
                    <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                      {u.email} · {timeAgo(u.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
