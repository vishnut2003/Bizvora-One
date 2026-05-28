import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import Company, { type ICompany } from "@/models/company";
import { COMPANY_MANAGER_ROLES } from "@/lib/company";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import DashboardLayout from "@/layouts/dashboard-layout";
import CompanyDetailsForm, {
  EMPTY_COMPANY_DEFAULTS,
  type CompanyFormDefaults,
} from "./_components/company-details-form";

export const metadata: Metadata = {
  title: "Company Details — BizvoraOne",
};

type CompanyDetailsPageProps = {
  params: Promise<{ workspaceId: string }>;
};

type LeanCompany = ICompany & { _id: { toString(): string } };

export default async function CompanyDetailsPage({
  params,
}: CompanyDetailsPageProps) {
  const { workspaceId } = await params;

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: COMPANY_MANAGER_ROLES,
  });

  const companyRaw = (await Company.findOne({
    workspace: workspaceId,
  }).lean()) as LeanCompany | null;

  const defaults: CompanyFormDefaults = companyRaw
    ? {
        legalName: companyRaw.legalName ?? "",
        displayName: companyRaw.displayName ?? "",
        email: companyRaw.email ?? "",
        phone: companyRaw.phone ?? "",
        website: companyRaw.website ?? "",
        line1: companyRaw.address?.line1 ?? "",
        line2: companyRaw.address?.line2 ?? "",
        city: companyRaw.address?.city ?? "",
        state: companyRaw.address?.state ?? "",
        country: companyRaw.address?.country ?? "",
        postalCode: companyRaw.address?.postalCode ?? "",
        gstin: companyRaw.gstin ?? "",
        pan: companyRaw.pan ?? "",
        cin: companyRaw.cin ?? "",
        taxId: companyRaw.taxId ?? "",
        bankName: companyRaw.bank?.bankName ?? "",
        accountName: companyRaw.bank?.accountName ?? "",
        accountNumber: companyRaw.bank?.accountNumber ?? "",
        ifsc: companyRaw.bank?.ifsc ?? "",
        branch: companyRaw.bank?.branch ?? "",
        upiId: companyRaw.bank?.upiId ?? "",
      }
    : EMPTY_COMPANY_DEFAULTS;

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role: myRole,
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
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.14] dark:via-zinc-900 dark:to-secondary/[0.10]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start gap-3.5 p-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
              />
              <Building2 className="relative h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Workspace Settings
              </p>
              <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Company Details
              </h1>
              <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                Your company profile for{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {workspace.name}
                </span>
                . These details appear on quotations, invoices and other
                documents.
              </p>
            </div>
          </div>
        </div>

        <CompanyDetailsForm workspaceId={workspace.id} defaults={defaults} />
      </div>
    </DashboardLayout>
  );
}
