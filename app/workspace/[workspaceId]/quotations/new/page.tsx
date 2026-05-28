import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import User from "@/models/user";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import type { WorkspaceColor } from "@/lib/workspace";
import {
  QUOTATION_VIEWER_ROLES,
  canManageAnyQuotation,
  canManageQuotation,
} from "@/lib/quotation";
import DashboardLayout from "@/layouts/dashboard-layout";
import QuotationForm from "../_components/quotation-form";
import {
  EMPTY_QUOTATION_DEFAULTS,
  type QuotationFormMember,
} from "../_lib/form-defaults";

export const metadata: Metadata = {
  title: "New quotation — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export default async function NewQuotationPage({ params }: Props) {
  const { workspaceId } = await params;

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...QUOTATION_VIEWER_ROLES],
  });

  const canCreate = canManageQuotation(role, session.user.id, {
    createdBy: session.user.id,
    assignedTo: null,
  });
  if (!canCreate) notFound();

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

  const defaults = {
    ...EMPTY_QUOTATION_DEFAULTS,
    issueDate: new Date(),
    assignedTo: canManageAnyQuotation(role) ? "" : session.user.id,
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
          <div className="flex items-start gap-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
              />
              <FileSpreadsheet className="relative h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                New quotation
              </p>
              <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Draft a quotation
              </h1>
              <p className="mt-0.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                The quotation number is generated automatically when you save.
              </p>
            </div>
          </div>
        </div>

        <QuotationForm
          mode="create"
          workspaceId={workspace.id}
          defaults={defaults}
          members={members}
          canManageAny={canManageAnyQuotation(role)}
          currentUserId={session.user.id}
        />
      </div>
    </DashboardLayout>
  );
}
