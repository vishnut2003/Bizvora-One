import type { Metadata } from "next";
import Link from "next/link";
import mongoose from "mongoose";
import {
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Pencil,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { FilterQuery } from "mongoose";
import Quotation, { type IQuotation } from "@/models/quotation";
import User from "@/models/user";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  QUOTATION_RECIPIENT_KINDS,
  QUOTATION_STATUSES,
  QUOTATION_STATUS_LABEL,
  QUOTATION_VIEWER_ROLES,
  canManageAnyQuotation,
  canViewAllQuotations,
  type QuotationRecipientKind,
  type QuotationStatus,
} from "@/lib/quotation";
import DashboardLayout from "@/layouts/dashboard-layout";
import QuotationCard, {
  type QuotationCardData,
} from "./_components/quotation-card";
import QuotationsToolbar from "./_components/quotations-toolbar";
import Button from "@/components/button";

export const metadata: Metadata = {
  title: "Quotations — WSS CRM",
};

type QuotationsPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LeanQuotation = Omit<
  IQuotation,
  "recipient" | "createdBy" | "workspace" | "assignedTo"
> & {
  _id: { toString(): string };
  workspace: { toString(): string };
  recipient: {
    kind: QuotationRecipientKind;
    refId: { toString(): string };
    name: string;
    company?: string;
    email?: string;
  };
  createdBy: { toString(): string };
  assignedTo: { toString(): string } | null;
  createdAt: Date;
  updatedAt: Date;
};

type LeanUser = {
  _id: { toString(): string };
  name?: string;
  email?: string;
};

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isStatus(v: string): v is QuotationStatus {
  return (QUOTATION_STATUSES as readonly string[]).includes(v);
}

function isKind(v: string): v is QuotationRecipientKind {
  return (QUOTATION_RECIPIENT_KINDS as readonly string[]).includes(v);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function QuotationsPage({
  params,
  searchParams,
}: QuotationsPageProps) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...QUOTATION_VIEWER_ROLES],
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const actorScope: FilterQuery<IQuotation> = canViewAllQuotations(role)
    ? { workspace: workspaceId }
    : {
        workspace: workspaceId,
        $or: [
          { createdBy: session.user.id },
          { assignedTo: session.user.id },
        ],
      };

  const q = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";
  const kindRaw = asString(sp.kind) ?? "all";
  const assigneeRaw = asString(sp.assignee) ?? "all";

  const listFilter: FilterQuery<IQuotation> = { ...actorScope };
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    listFilter.$and = [
      ...(listFilter.$and ?? []),
      {
        $or: [
          { number: re },
          { "recipient.name": re },
          { "recipient.company": re },
          { "recipient.email": re },
        ],
      },
    ];
  }
  if (isStatus(statusRaw)) listFilter.status = statusRaw;
  if (isKind(kindRaw)) listFilter["recipient.kind"] = kindRaw;
  if (canViewAllQuotations(role)) {
    if (assigneeRaw === "me") listFilter.assignedTo = session.user.id;
    else if (assigneeRaw === "unassigned") listFilter.assignedTo = null;
    else if (
      assigneeRaw !== "all" &&
      mongoose.Types.ObjectId.isValid(assigneeRaw)
    ) {
      listFilter.assignedTo = assigneeRaw;
    }
  }

  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];

  // For aggregation: cast workspace + assignee scope to ObjectId explicitly
  // (Mongoose doesn't auto-cast inside aggregate).
  const aggMatch: Record<string, unknown> = {
    workspace: new mongoose.Types.ObjectId(workspaceId),
  };
  if (!canViewAllQuotations(role)) {
    aggMatch.$or = [
      { createdBy: new mongoose.Types.ObjectId(session.user.id) },
      { assignedTo: new mongoose.Types.ObjectId(session.user.id) },
    ];
  }

  const [quotationsRaw, usersRaw, statusCountsRaw] = await Promise.all([
    Quotation.find(listFilter)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean() as unknown as Promise<LeanQuotation[]>,
    User.find({ _id: { $in: memberIds } })
      .select("name email")
      .lean() as unknown as Promise<LeanUser[]>,
    Quotation.aggregate<{ _id: QuotationStatus; count: number }>([
      { $match: aggMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const quotations: QuotationCardData[] = quotationsRaw.map((qd) => ({
    id: String(qd._id),
    number: qd.number,
    status: qd.status,
    recipient: {
      kind: qd.recipient.kind,
      name: qd.recipient.name,
      company: qd.recipient.company ?? "",
    },
    currency: qd.currency,
    issueDate: qd.issueDate.toISOString(),
    validUntil: qd.validUntil ? qd.validUntil.toISOString() : null,
    itemCount: qd.items?.length ?? 0,
    total: qd.total,
    updatedAt: qd.updatedAt.toISOString(),
  }));

  const canManage = canManageAnyQuotation(role);

  const countBy: Record<QuotationStatus, number> = {
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
  };
  let totalCount = 0;
  for (const row of statusCountsRaw) {
    if ((QUOTATION_STATUSES as readonly string[]).includes(row._id)) {
      countBy[row._id] = row.count;
      totalCount += row.count;
    }
  }

  const filtersApplied =
    Boolean(q) ||
    statusRaw !== "all" ||
    kindRaw !== "all" ||
    (canViewAllQuotations(role) && assigneeRaw !== "all");

  const stats: Array<{
    label: string;
    value: number;
    icon: typeof Layers;
    accent: string;
  }> = [
    {
      label: "Total",
      value: totalCount,
      icon: Layers,
      accent: "from-primary to-secondary",
    },
    {
      label: QUOTATION_STATUS_LABEL.draft,
      value: countBy.draft,
      icon: Pencil,
      accent: "from-zinc-500 to-zinc-700",
    },
    {
      label: QUOTATION_STATUS_LABEL.sent,
      value: countBy.sent,
      icon: Send,
      accent: "from-sky-500 to-indigo-600",
    },
    {
      label: QUOTATION_STATUS_LABEL.accepted,
      value: countBy.accepted,
      icon: CheckCircle2,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: QUOTATION_STATUS_LABEL.rejected,
      value: countBy.rejected + countBy.expired,
      icon: XCircle,
      accent: "from-rose-500 to-red-600",
    },
  ];

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-white to-secondary/[0.06] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 opacity-50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/15 opacity-40 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <FileSpreadsheet className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Sales
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Quotations
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  {canViewAllQuotations(role)
                    ? "Every quotation in "
                    : "Your quotations in "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            <div>
              <Link href={`/workspace/${workspace.id}/quotations/new`}>
                <Button type="button" variant="primary" size="sm">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  New quotation
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${stat.accent}`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${stat.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="relative mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {totalCount > 0 ? (
          <QuotationsToolbar
            members={usersRaw.map((u) => ({
              id: String(u._id),
              name: u.name ?? u.email ?? "Member",
            }))}
            currentUserId={session.user.id}
            showAssigneeFilter={canViewAllQuotations(role)}
          />
        ) : null}

        {quotations.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-white to-secondary/[0.04] dark:from-primary/[0.12] dark:via-zinc-900 dark:to-secondary/[0.10]"
            />
            <div className="relative flex flex-col items-center justify-center">
              <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <Sparkles className="relative h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[16px] font-medium text-zinc-900 dark:text-zinc-100">
                {filtersApplied
                  ? "No quotations match these filters"
                  : "No quotations yet"}
              </h2>
              <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {filtersApplied
                  ? "Try clearing the search or relaxing a filter from the toolbar above."
                  : canManage
                    ? "Draft your first quotation for a customer or lead — link it, add line items, and you're set."
                    : "Once a quotation is created and assigned to you, it'll show up here."}
              </p>
              {!filtersApplied && canManage ? (
                <div className="mt-5">
                  <Link href={`/workspace/${workspace.id}/quotations/new`}>
                    <Button type="button" variant="primary" size="sm">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      New quotation
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-sm">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                  />
                  <FileSpreadsheet className="relative h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                    {filtersApplied ? "Matching quotations" : "All quotations"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {quotations.length}{" "}
                    {quotations.length === 1 ? "quotation" : "quotations"}
                    {filtersApplied ? ` of ${totalCount}` : ""}, most recently
                    updated first
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {quotations.map((qd) => (
                <QuotationCard
                  key={qd.id}
                  quotation={qd}
                  href={`/workspace/${workspace.id}/quotations/${qd.id}/edit`}
                  pdfHref={`/workspace/${workspace.id}/quotations/${qd.id}/pdf`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
