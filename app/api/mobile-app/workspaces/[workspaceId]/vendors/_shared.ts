import "server-only";
import { VENDOR_STATUSES, type VendorStatus } from "@/lib/vendor";
import { canManageVendors, canViewVendors } from "@/lib/voucher";
import { MobileApiError, type MobileWorkspaceContext } from "@/lib/mobile-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function requireVendorViewer(ctx: MobileWorkspaceContext): void {
  if (!canViewVendors(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export function requireVendorManager(ctx: MobileWorkspaceContext): void {
  if (!canManageVendors(ctx.role)) throw new MobileApiError(403, "forbidden");
}

export type VendorBodyInput = {
  name: string;
  displayName: string;
  email: string;
  phone: string;
  contactPerson: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstin: string;
  pan: string;
  status: VendorStatus;
  notes: string;
};

// Mirrors parseForm from vendors/actions.ts.
export function parseVendorBody(
  body: Record<string, unknown>,
): VendorBodyInput {
  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";

  const errors: Record<string, string> = {};

  const name = str("name");
  if (!name) errors.name = "Name is required.";
  if (name.length > 160) errors.name = "Name is too long (max 160).";

  const email = str("email");
  if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email.";

  const phone = str("phone");
  if (phone.length > 40) errors.phone = "Phone is too long.";

  const status = str("status") || "active";
  if (!(VENDOR_STATUSES as readonly string[]).includes(status))
    errors.status = "Pick a status.";

  const gstin = str("gstin").toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) errors.gstin = "GSTIN format looks wrong.";

  const pan = str("pan").toUpperCase();
  if (pan && !PAN_RE.test(pan)) errors.pan = "PAN format looks wrong.";

  if (Object.keys(errors).length > 0) {
    throw new MobileApiError(422, "validation_failed", errors);
  }

  return {
    name,
    displayName: str("displayName"),
    email,
    phone,
    contactPerson: str("contactPerson"),
    line1: str("line1"),
    line2: str("line2"),
    city: str("city"),
    state: str("state"),
    country: str("country"),
    postalCode: str("postalCode"),
    gstin,
    pan,
    status: status as VendorStatus,
    notes: str("notes").slice(0, 4000),
  };
}

// Raw-record view of a vendor doc for partial-update merging.
export function vendorToRawInput(vendor: {
  name: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
  } | null;
  gstin?: string | null;
  pan?: string | null;
  status: string;
  notes?: string | null;
}): Record<string, unknown> {
  return {
    name: vendor.name,
    displayName: vendor.displayName ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    contactPerson: vendor.contactPerson ?? "",
    line1: vendor.address?.line1 ?? "",
    line2: vendor.address?.line2 ?? "",
    city: vendor.address?.city ?? "",
    state: vendor.address?.state ?? "",
    country: vendor.address?.country ?? "",
    postalCode: vendor.address?.postalCode ?? "",
    gstin: vendor.gstin ?? "",
    pan: vendor.pan ?? "",
    status: vendor.status,
    notes: vendor.notes ?? "",
  };
}
