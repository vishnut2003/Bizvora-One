import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { AlertTriangle, ArrowLeft, Building2, FileSpreadsheet } from "lucide-react";
import Quotation from "@/models/quotation";
import Company, { type ICompany } from "@/models/company";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import type { WorkspaceColor } from "@/lib/workspace";
import {
  QUOTATION_VIEWER_ROLES,
  canViewAllQuotations,
} from "@/lib/quotation";
import { canManageCompany, getMissingCompanyFields } from "@/lib/company";
import DashboardLayout from "@/layouts/dashboard-layout";
import {
  serializeQuotation,
  type QuotationDocLike,
} from "../../_lib/serialize";
import QuotationPdfViewer from "../../_components/quotation-pdf-viewer";
import type {
  QuotationPdfCompany,
  QuotationPdfData,
} from "../../_components/quotation-pdf-document";

export const metadata: Metadata = {
  title: "Quotation PDF — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; quotationId: string }>;
};

type LeanCompany = ICompany & { _id: { toString(): string } };

export default async function QuotationPdfPage({ params }: Props) {
  const { workspaceId, quotationId } = await params;

  if (!mongoose.Types.ObjectId.isValid(quotationId)) notFound();

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...QUOTATION_VIEWER_ROLES],
  });

  const [rawQuotation, rawCompany] = await Promise.all([
    Quotation.findOne({
      _id: quotationId,
      workspace: workspaceId,
    }).lean() as Promise<QuotationDocLike | null>,
    Company.findOne({ workspace: workspaceId }).lean() as Promise<LeanCompany | null>,
  ]);

  if (!rawQuotation) notFound();

  const quotation = serializeQuotation(rawQuotation);

  // Viewing is allowed for anyone who can see this quotation — sales execs are
  // scoped to the quotations they created or are assigned to.
  const canView =
    canViewAllQuotations(role) ||
    quotation.createdBy === session.user.id ||
    quotation.assignedTo === session.user.id;
  if (!canView) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const backLink = (
    <Link
      href={`/workspace/${workspace.id}/quotations/${quotation.id}/edit`}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
      aria-label="Back to quotation"
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );

  const header = (
    <div className="flex items-center gap-3">
      {backLink}
      <div className="flex items-start gap-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
          />
          <FileSpreadsheet className="relative h-4 w-4" />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            {quotation.number}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Quotation PDF
          </h1>
          <p className="mt-0.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            Preview and download the quotation for{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {quotation.recipient.name}
            </span>
            .
          </p>
        </div>
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
      >
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          {header}

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
                  The quotation PDF prints these details in the &ldquo;from&rdquo;
                  section. Add the missing information on the Company Details page
                  to generate the PDF.
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
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-4 text-sm font-medium text-white shadow-sm shadow-primary/25 transition-shadow hover:shadow-md hover:shadow-primary/35"
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
      </DashboardLayout>
    );
  }

  // rawCompany is guaranteed non-null here (missing would include all fields).
  const c = rawCompany!;
  const company: QuotationPdfCompany = {
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

  const pdfData: QuotationPdfData = {
    number: quotation.number,
    status: quotation.status,
    currency: quotation.currency,
    issueDate: quotation.issueDate,
    validUntil: quotation.validUntil,
    recipient: {
      name: quotation.recipient.name,
      company: quotation.recipient.company,
      email: quotation.recipient.email,
    },
    items: quotation.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
    })),
    subtotal: quotation.subtotal,
    taxTotal: quotation.taxTotal,
    discount: quotation.discount,
    total: quotation.total,
    notes: quotation.notes,
    terms: quotation.terms,
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
      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        <QuotationPdfViewer company={company} quotation={pdfData} />
      </div>
    </DashboardLayout>
  );
}
