import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import SalesInvoice, { type ISalesInvoice } from "@/models/sales-invoice";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  VOUCHER_VIEWER_ROLES,
  canManageVoucher,
  type SalesInvoiceStatus,
  type VoucherCurrency,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import SalesInvoiceForm from "../../_components/sales-invoice-form";

export const metadata: Metadata = { title: "Edit Sale Invoice — BizvoraOne" };

type LeanSI = ISalesInvoice & { _id: { toString(): string } };

type Props = {
  params: Promise<{ workspaceId: string; invoiceId: string }>;
};

export default async function EditSaleInvoicePage({ params }: Props) {
  const { workspaceId, invoiceId } = await params;
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VOUCHER_VIEWER_ROLES,
  });

  const inv = (await SalesInvoice.findOne({
    _id: invoiceId,
    workspace: workspaceId,
  }).lean()) as LeanSI | null;
  if (!inv) notFound();

  if (
    !canManageVoucher(role, session.user.id, {
      createdBy: String(inv.createdBy),
      assignedTo: inv.assignedTo ? String(inv.assignedTo) : null,
    })
  ) {
    notFound();
  }

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
          href={`/workspace/${workspace.id}/sale-invoices`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sale Invoices
        </Link>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              {inv.number}
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {inv.customer.name}
              {inv.customer.company ? ` · ${inv.customer.company}` : ""}
            </p>
          </div>
        </div>

        <SalesInvoiceForm
          mode="edit"
          workspaceId={workspace.id}
          invoiceId={String(inv._id)}
          defaults={{
            party: {
              kind: "customer",
              id: inv.customer.refId ? String(inv.customer.refId) : "",
              name: inv.customer.name,
              company: inv.customer.company ?? "",
              email: inv.customer.email ?? "",
              gstin: inv.customer.gstin ?? "",
            },
            currency: (inv.currency as VoucherCurrency) ?? "INR",
            primaryDate: new Date(inv.invoiceDate),
            secondaryDate: inv.dueDate ? new Date(inv.dueDate) : null,
            items: (inv.items ?? []).map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRate: it.taxRate,
            })),
            discount: inv.discount ?? 0,
            notes: inv.notes ?? "",
            status: inv.status as SalesInvoiceStatus,
          }}
        />
      </div>
    </DashboardLayout>
  );
}
