import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Subscription from "@/models/subscription";
import Workspace from "@/models/workspace";
import Plan from "@/models/plan";
import { cn } from "@/lib/cn";
import {
  BILLING_PERIOD_LABEL,
  SUBSCRIPTION_STATUS_BADGE_CLASS,
  SUBSCRIPTION_STATUS_LABEL,
  formatPaise,
  type BillingPeriod,
  type SubscriptionStatus,
} from "@/lib/billing";
import type { WorkspaceColor, WorkspaceStatus } from "@/lib/workspace";
import CancelSubscriptionButton from "./_components/cancel-subscription-button";
import ChangePlanButton, {
  type AvailablePlan,
} from "./_components/change-plan-button";

const swatch: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

type LeanSubscription = {
  _id: { toString(): string };
  workspace: { toString(): string };
  status: SubscriptionStatus;
  unitAmount: number;
  quantity: number;
  period: BillingPeriod;
  currentPeriodEnd: Date | null;
  nextChargeAt: Date | null;
  cancelAtPeriodEnd: boolean;
  seatSyncDirty?: boolean;
  pendingPlanSwap?: {
    newPlanName?: string;
    scheduledAt?: Date | null;
  } | null;
  plan?: { _id?: { toString(): string }; name?: string } | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  color: WorkspaceColor;
  status: WorkspaceStatus;
  memberCount: number;
  subscription: LeanSubscription | null;
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const workspaces = await Workspace.find({ owner: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  if (workspaces.length === 0) {
    return <EmptyState />;
  }

  const subs = (await Subscription.find({
    workspace: { $in: workspaces.map((w) => w._id) },
  })
    .populate<{
      plan: { _id?: { toString(): string }; name?: string } | null;
    }>("plan", "name")
    .lean()) as unknown as LeanSubscription[];
  const subByWorkspace = new Map(subs.map((s) => [String(s.workspace), s]));

  const planDocs = (await Plan.find({ visible: true, archived: false })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as unknown as Array<{
    _id: { toString(): string };
    name: string;
    description: string;
    amount: number;
    currency: string;
    period: BillingPeriod;
    featured: boolean;
    badge: string;
  }>;

  const availablePlans: AvailablePlan[] = planDocs.map((p) => ({
    id: String(p._id),
    name: p.name,
    description: p.description,
    amount: p.amount,
    currency: p.currency,
    period: p.period,
    featured: p.featured,
    badge: p.badge,
  }));

  const rows: WorkspaceRow[] = workspaces.map((w) => ({
    id: String(w._id),
    name: w.name,
    color: w.color as WorkspaceColor,
    status: (w.status as WorkspaceStatus | undefined) ?? "active",
    memberCount: w.members?.length ?? 0,
    subscription: subByWorkspace.get(String(w._id)) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
          Billing
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
          Subscriptions
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          One card per workspace you own. Cancel, switch plan, and view details
          from here.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <SubscriptionCard
            key={row.id}
            row={row}
            availablePlans={availablePlans}
          />
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({
  row,
  availablePlans,
}: {
  row: WorkspaceRow;
  availablePlans: AvailablePlan[];
}) {
  const sub = row.subscription;
  const initial = row.name.charAt(0).toUpperCase();

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[15px] font-semibold text-white shadow-sm",
            swatch[row.color],
          )}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            {row.name}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
            {row.memberCount} {row.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
        <Link
          href={`/workspace/${row.id}`}
          className="text-[12px] font-medium text-primary hover:underline"
        >
          Open workspace →
        </Link>
      </div>

      {!sub ? (
        <ManagedByAdminPlaceholder workspaceStatus={row.status} />
      ) : (
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                Plan
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-zinc-900 dark:text-white">
                {sub.plan?.name ?? "Custom"} ·{" "}
                {formatPaise(sub.unitAmount)} /{" "}
                {BILLING_PERIOD_LABEL[sub.period]} per user
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                SUBSCRIPTION_STATUS_BADGE_CLASS[sub.status],
              )}
            >
              {SUBSCRIPTION_STATUS_LABEL[sub.status]}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-[12px] sm:grid-cols-4">
            <Stat label="Seats" value={String(sub.quantity)} />
            <Stat
              label={
                sub.period === "yearly" ? "Per year" : "Per month"
              }
              value={formatPaise(sub.unitAmount * sub.quantity)}
            />
            <Stat
              label={sub.cancelAtPeriodEnd ? "Cancels on" : "Next charge"}
              value={formatDate(
                sub.cancelAtPeriodEnd
                  ? sub.currentPeriodEnd
                  : sub.nextChargeAt,
              )}
            />
            <Stat
              label="Current period ends"
              value={formatDate(sub.currentPeriodEnd)}
            />
          </dl>

          {sub.seatSyncDirty ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Seat count is out of sync with Razorpay. We&apos;ll retry
              automatically.
            </p>
          ) : null}

          {sub.pendingPlanSwap ? (
            <p className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              <ArrowRight className="h-3 w-3" />
              Switches to{" "}
              <strong>{sub.pendingPlanSwap.newPlanName || "new plan"}</strong>{" "}
              on{" "}
              <strong>
                {formatDate(
                  sub.pendingPlanSwap.scheduledAt ?? sub.currentPeriodEnd,
                )}
              </strong>
              .
            </p>
          ) : null}

          {sub.cancelAtPeriodEnd && !sub.pendingPlanSwap ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300">
              This subscription is scheduled to end on{" "}
              <strong>{formatDate(sub.currentPeriodEnd)}</strong>. To resume,
              contact support.
            </p>
          ) : null}

          {!sub.cancelAtPeriodEnd && !sub.pendingPlanSwap ? (
            <div className="flex flex-wrap items-center justify-end gap-4">
              {sub.plan?._id ? (
                <ChangePlanButton
                  workspaceId={row.id}
                  workspaceName={row.name}
                  currentPlanId={String(sub.plan._id)}
                  availablePlans={availablePlans}
                />
              ) : null}
              <CancelSubscriptionButton
                workspaceId={row.id}
                workspaceName={row.name}
                endDate={formatDate(sub.currentPeriodEnd)}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ManagedByAdminPlaceholder({
  workspaceStatus,
}: {
  workspaceStatus: WorkspaceStatus;
}) {
  if (workspaceStatus === "pending_payment") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 text-[12px]">
        <p className="text-zinc-600 dark:text-zinc-400">
          No subscription yet — complete payment to activate.
        </p>
        <Link
          href={`/workspace`}
          className="text-[12px] font-medium text-primary hover:underline"
        >
          Set up payment →
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-5 py-5 text-[12px] text-zinc-600 dark:text-zinc-400">
      <ShieldCheck className="h-4 w-4 text-zinc-400" />
      <p>
        Managed by platform admin — this workspace is comped and not billed
        through Razorpay.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
          Billing
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
          Subscriptions
        </h1>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <CreditCard className="mx-auto h-8 w-8 text-zinc-400" />
        <p className="mt-3 text-[14px] font-medium text-zinc-700 dark:text-zinc-200">
          No workspaces yet.
        </p>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          Create a workspace to start a subscription.
        </p>
        <Link
          href="/workspace"
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
        >
          Go to workspaces →
        </Link>
      </div>
    </div>
  );
}
