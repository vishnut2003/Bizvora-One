import { CreditCard } from "lucide-react";
import { connectDB } from "@/config/db";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import Plan from "@/models/plan";
import Subscription from "@/models/subscription";
import {
  BILLING_PERIOD_LABEL,
  formatPaise,
  type BillingPeriod,
} from "@/lib/billing";
import PlanList, { type PlanRow } from "./_components/plan-list";
import CreatePlanButton from "./_components/create-plan-button";

type LeanPlan = {
  _id: { toString(): string };
  razorpayPlanId: string;
  amount: number;
  currency: string;
  period: BillingPeriod;
  interval: number;
  name: string;
  description: string;
  badge: string;
  featured: boolean;
  visible: boolean;
  archived: boolean;
  sortOrder: number;
  createdAt: Date;
};

async function getPlans(): Promise<PlanRow[]> {
  await connectDB();
  const docs = (await Plan.find({})
    .sort({ archived: 1, sortOrder: 1, createdAt: 1 })
    .lean()) as unknown as LeanPlan[];

  if (docs.length === 0) return [];

  const counts = await Subscription.aggregate<{
    _id: { toString(): string };
    count: number;
  }>([
    {
      $match: {
        plan: { $in: docs.map((d) => d._id) },
        status: { $in: ["active", "authenticated", "pending"] },
      },
    },
    { $group: { _id: "$plan", count: { $sum: 1 } } },
  ]);
  const countByPlan = new Map(
    counts.map((c) => [String(c._id), c.count]),
  );

  return docs.map((p) => ({
    id: String(p._id),
    razorpayPlanId: p.razorpayPlanId,
    name: p.name,
    description: p.description,
    amount: p.amount,
    currency: p.currency,
    period: p.period,
    interval: p.interval,
    badge: p.badge,
    featured: p.featured,
    visible: p.visible,
    archived: p.archived,
    sortOrder: p.sortOrder,
    subscriberCount: countByPlan.get(String(p._id)) ?? 0,
    formattedAmount: formatPaise(p.amount, p.currency),
    periodLabel: BILLING_PERIOD_LABEL[p.period],
  }));
}

export default async function AdminPlansPage() {
  await requirePlatformAdmin();
  const plans = await getPlans();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            Platform admin
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Plans
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {plans.length} {plans.length === 1 ? "plan" : "plans"} · Per-seat
            pricing
          </p>
        </div>
        <CreatePlanButton />
      </div>

      <PlanList plans={plans} />

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-[12px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="font-semibold">About price changes</p>
        <p className="mt-1">
          Razorpay plans are immutable — price and billing period cannot be
          edited after creation. To change pricing, archive the existing plan
          and create a new one. Existing subscribers stay on the archived plan
          until they cancel or switch.
        </p>
      </div>
    </div>
  );
}
