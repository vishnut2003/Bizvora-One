import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import PurchaseInvoice, { type IPurchaseInvoice } from "@/models/purchase-invoice";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PURCHASE_MANAGER_ROLES,
  type PurchaseInvoiceStatus,
  type VoucherCurrency,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import PurchaseInvoiceForm from "../../_components/purchase-invoice-form";

export const metadata: Metadata = { title: "Edit Purchase Invoice — BizvoraOne" };

type LeanPI = IPurchaseInvoice & { _id: { toString(): string } };

type Props = {
  params: Promise<{ workspaceId: string; invoiceId: string }>;
};

export default async function EditPurchaseInvoicePage({ params }: Props) {
  const { workspaceId, invoiceId } = await params;
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PURCHASE_MANAGER_ROLES,
  });

  const inv = (await PurchaseInvoice.findOne({
    _id: invoiceId,
    workspace: workspaceId,
  }).lean()) as LeanPI | null;
  if (!inv) notFound();

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
          href={`/workspace/${workspace.id}/purchase-invoices`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Purchase Invoices
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
              {inv.vendor.name}
              {inv.vendor.company ? ` · ${inv.vendor.company}` : ""}
              {inv.vendorBillNumber ? ` · Vendor ref ${inv.vendorBillNumber}` : ""}
            </p>
          </div>
        </div>

        <PurchaseInvoiceForm
          mode="edit"
          workspaceId={workspace.id}
          invoiceId={String(inv._id)}
          vendorBillNumberDefault={inv.vendorBillNumber ?? ""}
          defaults={{
            party: {
              kind: "vendor",
              id: inv.vendor.refId ? String(inv.vendor.refId) : "",
              name: inv.vendor.name,
              company: inv.vendor.company ?? "",
              email: inv.vendor.email ?? "",
              gstin: inv.vendor.gstin ?? "",
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
            status: inv.status as PurchaseInvoiceStatus,
          }}
        />
      </div>
    </DashboardLayout>
  );
}
