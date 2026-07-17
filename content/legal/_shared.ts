// Shared constants for legal/policy pages.
// Values in square brackets are placeholders the business/legal team must finalise.

export const LAST_UPDATED = "2026-06-05";

export const BRAND = "BizvoraOne";
export const LEGAL_ENTITY = "Web Spider Solutions";

// "BizvoraOne" is a brand/product name, NOT a separately registered company.
// Web Spider Solutions is the registered legal entity that operates the service
// and is the party responsible under these documents. Shown on every legal page.
export const OPERATOR_NOTE = `${BRAND} is a product and brand operated by ${LEGAL_ENTITY}. "${BRAND}" is not itself a registered company — ${LEGAL_ENTITY} is the registered legal entity that provides the service and is responsible for it. In these terms, "we", "us", and "our" refer to ${LEGAL_ENTITY}.`;
export const PRODUCT_DESC =
  "an all-in-one business management platform providing CRM, projects, accounting, HR/payroll, and AI-assisted sales tooling";

// Contact details — replace placeholders before publishing.
export const CONTACT = {
  privacyEmail: "support@bizvoraone.com",
  supportEmail: "support@bizvoraone.com",
  grievanceOfficer: "Gaurav Thakur",
  grievanceEmail: "support@bizvoraone.com",
  registeredAddress: "TOWER-1, Assotech Business Cresterra, Unit no-415, Sector 135, Noida, Bajidpur, Uttar Pradesh 201304",
};

// Markdown table of the third-party sub-processors the platform relies on.
// Kept here so the Privacy Policy and the Sub-processors page stay in sync.
export const SUBPROCESSORS_TABLE = `| Sub-processor | Purpose | Data shared | Primary region |
| --- | --- | --- | --- |
| Resend | Transactional email delivery (invitations, notifications, password resets) | Recipient name & email, message content | United States |
| Vapi | Outbound AI voice calls to leads | Lead name, company, phone number, call context | United States |
| Google | Google Sign-In (OAuth) authentication | Account email & profile | United States / global |
| Vercel | File storage (Vercel Blob) | Uploaded files | United States / global |
| Google Ads | Inbound lead-form webhook ingestion | Lead form submissions (name, email, phone), campaign & click identifiers | United States / global |
| Anthropic (Claude) | AI generation of sales proposals | Prompt content you provide for proposal drafting | United States |
| MongoDB Atlas | Primary application database hosting | All application data at rest | Mumbai, India (ap-south-1) |`;
