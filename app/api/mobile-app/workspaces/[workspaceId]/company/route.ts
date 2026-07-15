import Company from "@/models/company";
import { COMPANY_MANAGER_ROLES } from "@/lib/company";
import { MobileApiError, requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, readJsonBody, serialize, withMobile } from "@/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9A-Z]{15}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// The web company-details page is owner/admin only; the mobile endpoints
// mirror that for both read and write.
export const GET = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    await requireMobileWorkspace(req, workspaceId, {
      allowedRoles: COMPANY_MANAGER_ROLES,
    });

    const company = await Company.findOne({ workspace: workspaceId }).lean();
    return ok({ company: company ? serialize(company) : null });
  },
);

export const PUT = withMobile(
  async (req, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const { userId } = await requireMobileWorkspace(req, workspaceId, {
      allowedRoles: COMPANY_MANAGER_ROLES,
    });

    const body = await readJsonBody(req);
    const str = (key: string) =>
      typeof body[key] === "string" ? (body[key] as string).trim() : "";

    const legalName = str("legalName");
    const email = str("email").toLowerCase();
    const gstin = str("gstin").toUpperCase();
    const pan = str("pan").toUpperCase();

    const fields: Record<string, string> = {};
    if (legalName.length < 2)
      fields.legalName = "Please enter the company name.";
    if (email && !EMAIL_RE.test(email))
      fields.email = "Please enter a valid email.";
    if (gstin && !GSTIN_RE.test(gstin))
      fields.gstin = "GSTIN must be 15 alphanumeric characters.";
    if (pan && !PAN_RE.test(pan))
      fields.pan = "PAN must look like ABCDE1234F.";
    if (Object.keys(fields).length > 0) {
      throw new MobileApiError(422, "validation_failed", fields);
    }

    const update = {
      legalName,
      displayName: str("displayName"),
      email,
      phone: str("phone"),
      website: str("website"),
      address: {
        line1: str("line1"),
        line2: str("line2"),
        city: str("city"),
        state: str("state"),
        country: str("country"),
        postalCode: str("postalCode"),
      },
      gstin,
      pan,
      cin: str("cin").toUpperCase(),
      taxId: str("taxId"),
      bank: {
        bankName: str("bankName"),
        accountName: str("accountName"),
        accountNumber: str("accountNumber"),
        ifsc: str("ifsc").toUpperCase(),
        branch: str("branch"),
        upiId: str("upiId"),
      },
      updatedBy: userId,
    };

    const company = await Company.findOneAndUpdate(
      { workspace: workspaceId },
      { $set: update, $setOnInsert: { workspace: workspaceId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return ok({ company: serialize(company) });
  },
);
