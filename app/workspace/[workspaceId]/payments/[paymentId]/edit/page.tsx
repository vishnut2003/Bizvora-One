import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import Payment, { type IPayment } from "@/models/payment";
import PurchaseInvoice from "@/models/purchase-invoice";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PURCHASE_MANAGER_ROLES,
  type PaymentMode,
  type PaymentStatus,
  type VoucherCurrency,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import PaymentForm from "../../_components/payment-form";

export const metadata: Metadata = { title: "Edit Payment — BizvoraOne" };

type LeanPayment = IPayment & { _id: { toString(): string } };

type Props = {
  params: Promise<{ workspaceId: string; paymentId: string }>;
};

export default async function EditPaymentPage({ params }: Props) {
  const { workspaceId, paymentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(paymentId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PURCHASE_MANAGER_ROLES,
  });

  const p = (await Payment.findOne({
    _id: paymentId,
    workspace: workspaceId,
  }).lean()) as LeanPayment | null;
  if (!p) notFound();

  const invIds = (p.allocations ?? []).map((a) => a.invoice);
  const invs = invIds.length
    ? ((await PurchaseInvoice.find({
        _id: { $in: invIds },
        workspace: workspaceId,
      })
        .select({ number: 1, total: 1, amountPaid: 1, currency: 1 })
        .lean()) as Array<{
        _id: { toString(): string };
        number: string;
        total: number;
        amountPaid?: number;
        currency: string;
      }>)
    : [];
  const balanceById = new Map(
    invs.map((i) => [
      String(i._id),
      Math.max(0, i.total - (i.amountPaid ?? 0)),
    ]),
  );
  const currencyById = new Map(invs.map((i) => [String(i._id), i.currency]));

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
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              {p.number}
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {p.vendor.name}
            </p>
          </div>
        </div>

        <PaymentForm
          mode="edit"
          workspaceId={workspace.id}
          paymentId={String(p._id)}
          defaults={{
            party: {
              kind: "vendor",
              id: p.vendor.refId ? String(p.vendor.refId) : "",
              name: p.vendor.name,
              company: p.vendor.company ?? "",
              email: p.vendor.email ?? "",
              gstin: p.vendor.gstin ?? "",
            },
            currency: (p.currency as VoucherCurrency) ?? "INR",
            primaryDate: new Date(p.paymentDate),
            amount: p.amount,
            paymentMode: p.paymentMode as PaymentMode,
            reference: p.reference ?? "",
            notes: p.notes ?? "",
            status: p.status as PaymentStatus,
            allocations: (p.allocations ?? []).map((a) => {
              const id = String(a.invoice);
              return {
                invoiceId: id,
                invoiceNumber: a.invoiceNumber || "",
                amount: a.amount,
                balance: (balanceById.get(id) ?? 0) + a.amount,
                currency: currencyById.get(id) ?? p.currency,
              };
            }),
          }}
        />
      </div>
    </DashboardLayout>
  );
}
