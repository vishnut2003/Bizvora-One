import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import BasicLayout from "@/layouts/basic-layout";
import { requireCheckoutAccess } from "@/lib/workspace-access";
import { connectDB } from "@/config/db";
import Plan from "@/models/plan";
import {
  BILLING_PERIOD_LABEL,
  formatPaise,
  type BillingPeriod,
} from "@/lib/billing";
import CheckoutButton from "./_components/checkout-button";

export const metadata: Metadata = {
  title: "Complete payment — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ plan?: string }>;
};

type LeanPlan = {
  _id: { toString(): string };
  name: string;
  description: string;
  amount: number;
  currency: string;
  period: BillingPeriod;
  badge: string;
  featured: boolean;
  sortOrder: number;
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { workspaceId } = await params;
  const { plan: planQuery } = await searchParams;

  const { workspace, session } = await requireCheckoutAccess(workspaceId);

  if ((workspace.status ?? "active") === "active") {
    redirect(`/workspace/${workspaceId}`);
  }

  await connectDB();
  const plans = (await Plan.find({
    visible: true,
    archived: false,
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as unknown as LeanPlan[];

  if (plans.length === 0) {
    return (
      <BasicLayout>
        <EmptyState
          title="Pricing not configured"
          message="A platform admin needs to add a plan before checkout is available."
        />
      </BasicLayout>
    );
  }

  const cookieStore = await cookies();
  const cookiePlan = cookieStore.get("bizvora_intended_plan")?.value;

  const selected =
    plans.find((p) => String(p._id) === planQuery) ??
    plans.find((p) => String(p._id) === cookiePlan) ??
    plans.find((p) => p.featured) ??
    plans[0];

  const seatCount = Math.max(1, workspace.members.length);
  const subtotal = selected.amount * seatCount;

  return (
    <BasicLayout>
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <Link
          href="/workspace"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to workspaces
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Activate{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {workspace.name}
            </span>
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Choose a plan and pay to unlock the workspace. You can change plan
            or cancel anytime from your account.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const isSelected = String(plan._id) === String(selected._id);
            const href = `/workspace/${workspaceId}/checkout?plan=${String(plan._id)}`;
            return (
              <Link
                key={String(plan._id)}
                href={href}
                replace
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all dark:bg-zinc-900 ${
                  isSelected
                    ? "border-primary shadow-lg shadow-primary/10 dark:border-primary"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  {plan.badge ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      <Sparkles className="h-2.5 w-2.5" />
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 flex items-end gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight">
                    {formatPaise(plan.amount, plan.currency)}
                  </span>
                  <span className="pb-1 text-xs text-zinc-500">
                    / user / {BILLING_PERIOD_LABEL[plan.period]}
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-500">{plan.description}</p>
                {isSelected ? (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Check className="h-3.5 w-3.5" />
                    Selected
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Order summary
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Plan</dt>
              <dd className="font-medium">
                {selected.name} —{" "}
                {formatPaise(selected.amount, selected.currency)} /{" "}
                {BILLING_PERIOD_LABEL[selected.period]} per user
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Seats</dt>
              <dd className="font-medium tabular-nums">{seatCount}</dd>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <dt className="font-semibold">Due now</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatPaise(subtotal, selected.currency)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-zinc-500">
            Exclusive of taxes. GST-compliant invoices are issued by Razorpay
            on each successful charge.
          </p>
        </div>

        <CheckoutButton
          workspaceId={workspaceId}
          planId={String(selected._id)}
          workspaceName={workspace.name}
          planLabel={selected.name}
          prefill={{
            name: session.user?.name ?? "",
            email: session.user?.email ?? "",
          }}
        />

        <p className="mt-6 text-center text-[11px] text-zinc-500">
          Secured by Razorpay. Cards, UPI, NetBanking and wallets supported.
        </p>
      </section>
    </BasicLayout>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <section className="mx-auto w-full max-w-xl px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      <Link
        href="/workspace"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to workspaces
      </Link>
    </section>
  );
}
