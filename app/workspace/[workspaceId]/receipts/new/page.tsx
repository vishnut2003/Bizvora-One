import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import { ArrowLeft, Banknote } from "lucide-react";
import Customer from "@/models/customer";
import SalesInvoice from "@/models/sales-invoice";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { VOUCHER_MANAGER_ROLES } from "@/lib/voucher";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import ReceiptForm from "../_components/receipt-form";

export const metadata: Metadata = { title: "New Receipt — BizvoraOne" };

type Props = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function NewReceiptPage({ params, searchParams }: Props) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VOUCHER_MANAGER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  // Support deep-link prefill from the Recovery page:
  // /receipts/new?customerId=...&invoiceId=...
  const customerId = asString(sp.customerId);
  const invoiceId = asString(sp.invoiceId);
  let prefillParty = null as null | {
    kind: "customer";
    id: string;
    name: string;
    company: string;
    email: string;
    gstin: string;
  };
  let prefillAllocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    balance: number;
    currency: string;
  }> = [];
  const prefillCurrency = "INR" as const;
  let prefillAmount = 0;

  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    const customer = await Customer.findOne({
      _id: customerId,
      workspace: workspaceId,
    })
      .select({ name: 1, company: 1, email: 1, gstin: 1 })
      .lean();
    if (customer) {
      const c = customer as {
        _id: { toString(): string };
        name: string;
        company?: string;
        email?: string | null;
        gstin?: string;
      };
      prefillParty = {
        kind: "customer",
        id: String(c._id),
        name: c.name,
        company: c.company ?? "",
        email: c.email ?? "",
        gstin: c.gstin ?? "",
      };
    }
    if (invoiceId && mongoose.Types.ObjectId.isValid(invoiceId)) {
      const inv = await SalesInvoice.findOne({
        _id: invoiceId,
        workspace: workspaceId,
        "customer.refId": customerId,
      })
        .select({ number: 1, total: 1, amountPaid: 1, currency: 1 })
        .lean();
      if (inv) {
        const i = inv as {
          _id: { toString(): string };
          number: string;
          total: number;
          amountPaid?: number;
          currency: string;
        };
        const balance = Math.max(0, i.total - (i.amountPaid ?? 0));
        prefillAllocations = [
          {
            invoiceId: String(i._id),
            invoiceNumber: i.number,
            amount: balance,
            balance,
            currency: i.currency,
          },
        ];
        prefillAmount = balance;
      }
    }
  }

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
            <Banknote className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Record receipt
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Money received from a customer. Optionally allocate it against open invoices.
            </p>
          </div>
        </div>

        <ReceiptForm
          mode="create"
          workspaceId={workspace.id}
          defaults={{
            party: prefillParty,
            currency: prefillCurrency,
            primaryDate: new Date(),
            amount: prefillAmount,
            paymentMode: "bank",
            reference: "",
            notes: "",
            status: "cleared",
            allocations: prefillAllocations,
          }}
        />
      </div>
    </DashboardLayout>
  );
}
