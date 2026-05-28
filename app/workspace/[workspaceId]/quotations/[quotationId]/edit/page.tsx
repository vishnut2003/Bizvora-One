import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import Quotation from "@/models/quotation";
import User from "@/models/user";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import type { WorkspaceColor } from "@/lib/workspace";
import {
  QUOTATION_CURRENCIES,
  QUOTATION_VIEWER_ROLES,
  canManageAnyQuotation,
  canManageQuotation,
  type QuotationCurrency,
} from "@/lib/quotation";
import DashboardLayout from "@/layouts/dashboard-layout";
import QuotationForm from "../../_components/quotation-form";
import type {
  QuotationFormDefaults,
  QuotationFormMember,
} from "../../_lib/form-defaults";
import {
  serializeQuotation,
  type QuotationDocLike,
} from "../../_lib/serialize";

export const metadata: Metadata = {
  title: "Edit quotation — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; quotationId: string }>;
};

export default async function EditQuotationPage({ params }: Props) {
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

  const raw = (await Quotation.findOne({
    _id: quotationId,
    workspace: workspaceId,
  }).lean()) as QuotationDocLike | null;
  if (!raw) notFound();

  const quotation = serializeQuotation(raw);

  const ownerIds = {
    createdBy: quotation.createdBy,
    assignedTo: quotation.assignedTo,
  };
  if (!canManageQuotation(role, session.user.id, ownerIds)) notFound();

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];

  const usersRaw = (await User.find({ _id: { $in: memberIds } })
    .select("name email image")
    .lean()) as Array<{
    _id: { toString(): string };
    name?: string;
    email?: string;
    image?: string | null;
  }>;

  const members: QuotationFormMember[] = usersRaw.map((u) => ({
    id: String(u._id),
    name: u.name ?? u.email ?? "Member",
    email: u.email ?? "",
    image: u.image ?? null,
  }));

  const isValidCurrency = (QUOTATION_CURRENCIES as readonly string[]).includes(
    quotation.currency,
  );

  const defaults: QuotationFormDefaults = {
    recipient: {
      kind: quotation.recipient.kind,
      // Custom recipients have no backing CRM id.
      id: quotation.recipient.refId ?? "",
      name: quotation.recipient.name,
      company: quotation.recipient.company,
      email: quotation.recipient.email,
    },
    currency: isValidCurrency
      ? (quotation.currency as QuotationCurrency)
      : "INR",
    status: quotation.status,
    issueDate: new Date(quotation.issueDate),
    validUntil: quotation.validUntil ? new Date(quotation.validUntil) : null,
    items: quotation.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
    })),
    discount: quotation.discount,
    notes: quotation.notes,
    terms: quotation.terms,
    assignedTo: quotation.assignedTo ?? "",
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
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${workspace.id}/quotations`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white"
            aria-label="Back to quotations"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-start gap-3">
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
                Edit quotation
              </h1>
              <p className="mt-0.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                Update line items, status, or scheduling for{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {quotation.recipient.name}
                </span>
                .
              </p>
            </div>
          </div>
          <Link
            href={`/workspace/${workspace.id}/quotations/${quotation.id}/pdf`}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
          >
            <FileText className="h-4 w-4" />
            View PDF
          </Link>
        </div>

        <QuotationForm
          mode="edit"
          workspaceId={workspace.id}
          quotationId={quotation.id}
          defaults={defaults}
          members={members}
          canManageAny={canManageAnyQuotation(role)}
          currentUserId={session.user.id}
        />
      </div>
    </DashboardLayout>
  );
}
