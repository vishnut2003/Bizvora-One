import { Building2 } from "lucide-react";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Subscription from "@/models/subscription";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { timeAgo } from "@/lib/time";
import {
  WORKSPACE_STATUS_LABEL,
  type WorkspaceColor,
  type WorkspaceStatus,
} from "@/lib/workspace";
import {
  SUBSCRIPTION_STATUS_LABEL,
  type SubscriptionStatus,
} from "@/lib/billing";
import WorkspaceStatusSelect from "./_components/workspace-status-select";

const swatch: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

// Sort order so pending approvals surface at the top of the table.
const STATUS_RANK: Record<WorkspaceStatus, number> = {
  pending_payment: 0,
  suspended: 1,
  rejected: 2,
  active: 3,
};

type Row = {
  id: string;
  name: string;
  color: WorkspaceColor;
  status: WorkspaceStatus;
  memberCount: number;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  subscription: {
    planName: string | null;
    status: SubscriptionStatus;
    nextChargeAt: string | null;
  } | null;
};

async function getWorkspaces(): Promise<Row[]> {
  await connectDB();
  const docs = await Workspace.find({})
    .populate<{ owner: { name?: string; email?: string } | null }>(
      "owner",
      "name email",
    )
    .sort({ createdAt: -1 })
    .lean();

  // Join in subscription info via a single query keyed by workspace id.
  const subs = await Subscription.find({
    workspace: { $in: docs.map((d) => d._id) },
  })
    .populate<{ plan: { name?: string } | null }>("plan", "name")
    .lean();
  const subByWorkspace = new Map(
    subs.map((s) => [String(s.workspace), s]),
  );

  const rows: Row[] = docs.map((w) => {
    const sub = subByWorkspace.get(String(w._id));
    return {
      id: String(w._id),
      name: w.name,
      color: w.color as WorkspaceColor,
      status: (w.status as WorkspaceStatus | undefined) ?? "active",
      memberCount: w.members?.length ?? 0,
      ownerName: w.owner?.name ?? "Unknown",
      ownerEmail: w.owner?.email ?? "—",
      createdAt: (w.createdAt as Date).toISOString(),
      subscription: sub
        ? {
            planName: sub.plan?.name ?? null,
            status: sub.status as SubscriptionStatus,
            nextChargeAt: sub.nextChargeAt
              ? (sub.nextChargeAt as Date).toISOString()
              : null,
          }
        : null,
    };
  });

  return rows.sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      (a.createdAt < b.createdAt ? 1 : -1),
  );
}

export default async function AdminWorkspacesPage() {
  await requirePlatformAdmin();
  const workspaces = await getWorkspaces();
  const pending = workspaces.filter((w) => w.status === "pending_payment").length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            Platform admin
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Workspaces
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {workspaces.length} total
            {pending > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {pending} awaiting review
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {workspaces.length === 0 ? (
          <div className="grid place-items-center p-16 text-center">
            <Building2 className="h-8 w-8 text-zinc-400" />
            <p className="mt-3 text-[14px] font-medium text-zinc-700 dark:text-zinc-200">
              No workspaces yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {workspaces.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center gap-3.5 px-4 py-3.5 sm:px-5"
              >
                <span
                  className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg text-[14px] font-semibold text-white shadow-sm ${swatch[w.color]}`}
                >
                  {w.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {w.name}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                    {w.ownerName}
                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">
                      ·
                    </span>
                    {w.ownerEmail}
                  </p>
                </div>

                <div className="hidden text-right text-[12px] text-zinc-500 sm:block dark:text-zinc-400">
                  <p className="tabular-nums">
                    {w.memberCount}{" "}
                    {w.memberCount === 1 ? "member" : "members"}
                  </p>
                  <p className="mt-0.5">Created {timeAgo(w.createdAt)}</p>
                </div>

                <div className="hidden min-w-[140px] text-right text-[12px] text-zinc-500 md:block dark:text-zinc-400">
                  {w.subscription ? (
                    <>
                      <p className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                        {w.subscription.planName ?? "Plan"}
                      </p>
                      <p className="mt-0.5">
                        {SUBSCRIPTION_STATUS_LABEL[w.subscription.status]}
                        {w.subscription.nextChargeAt
                          ? ` · ${timeAgo(w.subscription.nextChargeAt)}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="italic text-zinc-400 dark:text-zinc-500">
                      No subscription
                    </p>
                  )}
                </div>

                <WorkspaceStatusSelect workspaceId={w.id} status={w.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        New workspaces start as{" "}
        <span className="font-medium">
          {WORKSPACE_STATUS_LABEL.pending_payment}
        </span>{" "}
        and are inaccessible to their owner until set to{" "}
        <span className="font-medium">{WORKSPACE_STATUS_LABEL.active}</span>.
      </p>
    </div>
  );
}
