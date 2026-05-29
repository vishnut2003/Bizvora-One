import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { AlertTriangle, ArrowLeft, Building2, BadgeCheck } from "lucide-react";
import Receipt, { type IReceipt } from "@/models/receipt";
import Company, { type ICompany } from "@/models/company";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import type { WorkspaceColor } from "@/lib/workspace";
import {
  VOUCHER_VIEWER_ROLES,
  canViewAllVouchers,
  type PaymentMode,
  type ReceiptStatus,
} from "@/lib/voucher";
import { canManageCompany, getMissingCompanyFields } from "@/lib/company";
import DashboardLayout from "@/layouts/dashboard-layout";
import ReceiptPdfViewer from "../../_components/receipt-pdf-viewer";
import type {
  ReceiptPdfCompany,
  ReceiptPdfData,
} from "../../_components/receipt-pdf-document";

export const metadata: Metadata = {
  title: "Receipt PDF — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; receiptId: string }>;
};

type LeanReceipt = IReceipt & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

type LeanCompany = ICompany & { _id: { toString(): string } };

export default async function ReceiptPdfPage({ params }: Props) {
  const { workspaceId, receiptId } = await params;

  if (!mongoose.Types.ObjectId.isValid(receiptId)) notFound();

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: VOUCHER_VIEWER_ROLES,
  });

  const [rawReceipt, rawCompany] = await Promise.all([
    Receipt.findOne({
      _id: receiptId,
      workspace: workspaceId,
    }).lean() as Promise<LeanReceipt | null>,
    Company.findOne({ workspace: workspaceId }).lean() as Promise<LeanCompany | null>,
  ]);

  if (!rawReceipt) notFound();

  // Viewing is allowed for anyone who can see this receipt — sales execs are
  // scoped to receipts they created or are assigned to.
  const canView =
    canViewAllVouchers(role) ||
    String(rawReceipt.createdBy) === session.user.id ||
    (rawReceipt.assignedTo !== null &&
      String(rawReceipt.assignedTo) === session.user.id);
  if (!canView) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const backLink = (
    <Link
      href={`/workspace/${workspace.id}/receipts/${rawReceipt._id.toString()}/edit`}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
      aria-label="Back to receipt"
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );

  const header = (
    <div className="flex shrink-0 items-center gap-3 border-b border-zinc-100 bg-white/60 px-4 py-2.5 backdrop-blur sm:px-6 lg:px-8 dark:border-zinc-800 dark:bg-zinc-950/50">
      {backLink}
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-linear-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30">
        <BadgeCheck className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="truncate text-[14px] font-semibold text-zinc-900 dark:text-white">
          {rawReceipt.number}
        </h1>
        <span className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">
          · {rawReceipt.customer.name}
        </span>
      </div>
    </div>
  );

  const missing = getMissingCompanyFields(rawCompany);

  if (missing.length > 0) {
    const canEditCompany = canManageCompany(role);
    return (
      <DashboardLayout
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
        workspace={workspace}
        fullBleed
      >
        <div className="flex h-full min-h-0 flex-col">
          {header}
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                    Complete your company details first
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                    The receipt PDF prints these details in the
                    &ldquo;received by&rdquo; section. Add the missing
                    information on the Company Details page to generate the
                    PDF.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {missing.map((field) => (
                      <span
                        key={field}
                        className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    {canEditCompany ? (
                      <Link
                        href={`/workspace/${workspace.id}/company-details`}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-linear-to-r from-primary to-secondary px-4 text-sm font-medium text-white shadow-sm shadow-primary/25 transition-shadow hover:shadow-md hover:shadow-primary/35"
                      >
                        <Building2 className="h-4 w-4" />
                        Go to Company Details
                      </Link>
                    ) : (
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                        Ask a workspace owner or admin to complete the company
                        profile.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const c = rawCompany!;
  const company: ReceiptPdfCompany = {
    legalName: c.legalName ?? "",
    displayName: c.displayName ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    website: c.website ?? "",
    address: {
      line1: c.address?.line1 ?? "",
      line2: c.address?.line2 ?? "",
      city: c.address?.city ?? "",
      state: c.address?.state ?? "",
      country: c.address?.country ?? "",
      postalCode: c.address?.postalCode ?? "",
    },
    gstin: c.gstin ?? "",
    pan: c.pan ?? "",
    cin: c.cin ?? "",
    bank: {
      bankName: c.bank?.bankName ?? "",
      accountName: c.bank?.accountName ?? "",
      accountNumber: c.bank?.accountNumber ?? "",
      ifsc: c.bank?.ifsc ?? "",
      branch: c.bank?.branch ?? "",
      upiId: c.bank?.upiId ?? "",
    },
  };

  const pdfData: ReceiptPdfData = {
    number: rawReceipt.number,
    status: rawReceipt.status as ReceiptStatus,
    currency: rawReceipt.currency,
    receiptDate: new Date(rawReceipt.receiptDate).toISOString(),
    amount: rawReceipt.amount,
    paymentMode: rawReceipt.paymentMode as PaymentMode,
    reference: rawReceipt.reference ?? "",
    customer: {
      name: rawReceipt.customer.name,
      company: rawReceipt.customer.company ?? "",
      email: rawReceipt.customer.email ?? "",
      gstin: rawReceipt.customer.gstin ?? "",
    },
    allocations: (rawReceipt.allocations ?? []).map((a) => ({
      invoiceNumber: a.invoiceNumber ?? "",
      amount: a.amount,
    })),
    notes: rawReceipt.notes ?? "",
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
      fullBleed
    >
      <div className="flex h-full min-h-0 flex-col">
        {header}
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <ReceiptPdfViewer company={company} receipt={pdfData} />
        </div>
      </div>
    </DashboardLayout>
  );
}
