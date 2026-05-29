import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import PurchaseOrder, { type IPurchaseOrder } from "@/models/purchase-order";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PURCHASE_MANAGER_ROLES,
  type PurchaseOrderStatus,
  type VoucherCurrency,
} from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import PurchaseOrderForm from "../../_components/purchase-order-form";

export const metadata: Metadata = { title: "Edit Purchase Order — BizvoraOne" };

type LeanPO = IPurchaseOrder & { _id: { toString(): string } };
type Props = {
  params: Promise<{ workspaceId: string; orderId: string }>;
};

export default async function EditPurchaseOrderPage({ params }: Props) {
  const { workspaceId, orderId } = await params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) notFound();

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: PURCHASE_MANAGER_ROLES,
  });

  const order = (await PurchaseOrder.findOne({
    _id: orderId,
    workspace: workspaceId,
  }).lean()) as LeanPO | null;
  if (!order) notFound();

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
          href={`/workspace/${workspace.id}/purchase-orders`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Purchase Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <Pencil className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                {order.number}
              </h1>
              <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                {order.vendor.name}
                {order.vendor.company ? ` · ${order.vendor.company}` : ""}
              </p>
            </div>
          </div>
          <Link
            href={`/workspace/${workspace.id}/purchase-orders/${String(order._id)}/pdf`}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
          >
            <FileText className="h-4 w-4" />
            View PDF
          </Link>
        </div>

        <PurchaseOrderForm
          mode="edit"
          workspaceId={workspace.id}
          orderId={String(order._id)}
          defaults={{
            party: {
              kind: "vendor",
              id: order.vendor.refId ? String(order.vendor.refId) : "",
              name: order.vendor.name,
              company: order.vendor.company ?? "",
              email: order.vendor.email ?? "",
              gstin: order.vendor.gstin ?? "",
            },
            currency: (order.currency as VoucherCurrency) ?? "INR",
            primaryDate: new Date(order.orderDate),
            secondaryDate: order.expectedDate ? new Date(order.expectedDate) : null,
            items: (order.items ?? []).map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRate: it.taxRate,
            })),
            discount: order.discount ?? 0,
            notes: order.notes ?? "",
            status: order.status as PurchaseOrderStatus,
          }}
        />
      </div>
    </DashboardLayout>
  );
}
