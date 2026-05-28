import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import Receipt, { type IReceipt } from "@/models/receipt";
import SalesInvoice from "@/models/sales-invoice";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  VOUCHER_VIEWER_ROLES,
  canManageVoucher,
  type PaymentMode,
  type ReceiptStatus,
  type VoucherCurrency,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import ReceiptForm from "../../_components/receipt-form";

export const metadata: Metadata = { title: "Edit Receipt — BizvoraOne" };

type LeanReceipt = IReceipt & { _id: { toString(): string } };

type Props = {
  params: Promise<{ workspaceId: string; receiptId: string }>;
};

export default async function EditReceiptPage({ params }: Props) {
  const { workspaceId, receiptId } = await params;
  if (!mongoose.Types.ObjectId.isValid(receiptId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VOUCHER_VIEWER_ROLES,
  });

  const r = (await Receipt.findOne({
    _id: receiptId,
    workspace: workspaceId,
  }).lean()) as LeanReceipt | null;
  if (!r) notFound();

  if (
    !canManageVoucher(role, session.user.id, {
      createdBy: String(r.createdBy),
      assignedTo: r.assignedTo ? String(r.assignedTo) : null,
    })
  ) {
    notFound();
  }

  // Load balance snapshots for current allocation rows (for the editor display).
  const invIds = (r.allocations ?? []).map((a) => a.invoice);
  const invs = invIds.length
    ? ((await SalesInvoice.find({
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
          href={`/workspace/${workspace.id}/receipts`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Receipts
        </Link>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              {r.number}
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {r.customer.name}
            </p>
          </div>
        </div>

        <ReceiptForm
          mode="edit"
          workspaceId={workspace.id}
          receiptId={String(r._id)}
          defaults={{
            party: {
              kind: "customer",
              id: r.customer.refId ? String(r.customer.refId) : "",
              name: r.customer.name,
              company: r.customer.company ?? "",
              email: r.customer.email ?? "",
              gstin: r.customer.gstin ?? "",
            },
            currency: (r.currency as VoucherCurrency) ?? "INR",
            primaryDate: new Date(r.receiptDate),
            amount: r.amount,
            paymentMode: r.paymentMode as PaymentMode,
            reference: r.reference ?? "",
            notes: r.notes ?? "",
            status: r.status as ReceiptStatus,
            allocations: (r.allocations ?? []).map((a) => {
              const id = String(a.invoice);
              return {
                invoiceId: id,
                invoiceNumber: a.invoiceNumber || "",
                amount: a.amount,
                balance:
                  // Balance shown in the editor = current outstanding + what
                  // this receipt itself currently covers (so the user has the
                  // full headroom to re-allocate).
                  (balanceById.get(id) ?? 0) + a.amount,
                currency: currencyById.get(id) ?? r.currency,
              };
            }),
          }}
        />
      </div>
    </DashboardLayout>
  );
}
