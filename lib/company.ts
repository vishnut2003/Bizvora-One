import type { UserRole } from "@/lib/user";

// Only the workspace owner and admins can view or edit the company profile.
// It feeds seller details onto quotations, invoices and other documents.
export const COMPANY_MANAGER_ROLES: UserRole[] = ["owner", "admin"];

export function canManageCompany(role: UserRole): boolean {
  return COMPANY_MANAGER_ROLES.includes(role);
}

export type CompanyProfileLike = {
  legalName?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;
} | null;

// Fields a quotation/invoice needs from the seller before it can be rendered.
// Returns human-readable labels for whatever is still missing so the UI can
// nudge the user to complete the Company Details page.
export function getMissingCompanyFields(company: CompanyProfileLike): string[] {
  const a = company?.address ?? {};
  const checks: Array<[string, string | undefined]> = [
    ["Company name", company?.legalName],
    ["Email", company?.email],
    ["Phone", company?.phone],
    ["Address line 1", a?.line1],
    ["City", a?.city],
    ["State", a?.state],
    ["Country", a?.country],
  ];
  return checks
    .filter(([, value]) => !value || value.trim().length === 0)
    .map(([label]) => label);
}
