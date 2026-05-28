import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PURCHASE_MANAGER_ROLES } from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import PaymentForm from "../_components/payment-form";

export const metadata: Metadata = { title: "New Payment — BizvoraOne" };

type Props = { params: Promise<{ workspaceId: string }> };

export default async function NewPaymentPage({ params }: Props) {
  const { workspaceId } = await params;
  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PURCHASE_MANAGER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Link
          href={`/workspace/${workspace.id}/payments`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Payments
        </Link>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Record payment
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Money paid to a vendor. Optionally allocate it against open bills.
            </p>
          </div>
        </div>

        <PaymentForm
          mode="create"
          workspaceId={workspace.id}
          defaults={{
            party: null,
            currency: "INR",
            primaryDate: new Date(),
            amount: 0,
            paymentMode: "bank",
            reference: "",
            notes: "",
            status: "cleared",
            allocations: [],
          }}
        />
      </div>
    </DashboardLayout>
  );
}
