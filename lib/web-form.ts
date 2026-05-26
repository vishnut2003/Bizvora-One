import "server-only";

export type WebFormSubmission = Record<string, string>;

// ----------------------------------------------------------------------------
// Body parsing
// ----------------------------------------------------------------------------

// Plugins sometimes send nested keys like `form_fields[email]` or
// `data[0][value]`. We flatten those into the leaf name so the field mapper
// can find them. The leaf wins on collision (later iterations override).
function normalizeKey(rawKey: string): string {
  // Pull the innermost bracketed segment if present: `form_fields[email]` -> `email`
  const bracketMatch = rawKey.match(/\[([^\]]+)\]\s*$/);
  if (bracketMatch) return bracketMatch[1];
  return rawKey;
}

function setField(out: WebFormSubmission, rawKey: string, value: string) {
  const key = normalizeKey(rawKey).trim();
  if (!key) return;
  // Flatten arrays/multi-selects: comma-join repeat keys.
  if (out[key] !== undefined && out[key] !== "") {
    out[key] = `${out[key]}, ${value}`;
  } else {
    out[key] = value;
  }
}

// Recursively flatten any JSON shape into plain string fields, e.g.
// `{ names: { first: "Jane" } }` -> `{ first: "Jane" }`.
function flattenJsonValue(
  out: WebFormSubmission,
  parentKey: string,
  value: unknown,
) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      setField(out, parentKey, value.join(", "));
    } else {
      value.forEach((v) => flattenJsonValue(out, parentKey, v));
    }
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      flattenJsonValue(out, k, v);
    }
    return;
  }
  setField(out, parentKey, String(value));
}

export async function parseWebFormBody(
  request: Request,
): Promise<WebFormSubmission> {
  const out: WebFormSubmission = {};
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();

  // multipart/form-data and application/x-www-form-urlencoded share the
  // FormData API on Web Request; the runtime picks the right parser.
  if (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  ) {
    const fd = await request.formData();
    for (const [key, value] of fd.entries()) {
      if (typeof value === "string") setField(out, key, value);
    }
    return out;
  }

  // Default: try JSON, then fall back to text-as-urlencoded (some plugins
  // send urlencoded data without setting the header).
  const text = await request.text();
  if (!text) return out;

  if (
    ct.includes("application/json") ||
    text.trimStart().startsWith("{") ||
    text.trimStart().startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(text);
      flattenJsonValue(out, "", parsed);
      return out;
    } catch {
      /* fall through to urlencoded */
    }
  }

  // Last-resort: best-effort urlencoded parse.
  try {
    const params = new URLSearchParams(text);
    for (const [key, value] of params.entries()) setField(out, key, value);
  } catch {
    /* give up — leave out empty */
  }
  return out;
}

// ----------------------------------------------------------------------------
// Auth key extraction
// ----------------------------------------------------------------------------

const KEY_HEADER_NAMES = ["x-webhook-key", "x-wss-key", "x-api-key"];
const KEY_BODY_FIELDS = ["_webhook_key", "webhook_key", "wss_key", "api_key"];

export function readWebFormKey(
  headers: Headers,
  body: WebFormSubmission,
): string {
  for (const h of KEY_HEADER_NAMES) {
    const v = headers.get(h);
    if (v && v.trim()) return v.trim();
  }
  for (const k of KEY_BODY_FIELDS) {
    const v = body[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

// ----------------------------------------------------------------------------
// Honeypot detection
// ----------------------------------------------------------------------------

const HONEYPOT_FIELDS = [
  "_gotcha",
  "gotcha",
  "honeypot",
  "honey_pot",
  "botfield",
  "bot_field",
  "website_url", // common honeypot field name; real "website" maps separately
];

export function looksLikeBot(body: WebFormSubmission): boolean {
  for (const f of HONEYPOT_FIELDS) {
    const v = body[f];
    if (typeof v === "string" && v.trim() !== "") return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// Field mapping
// ----------------------------------------------------------------------------

const ALIASES: Record<string, string[]> = {
  name: [
    "name",
    "fullname",
    "yourname",
    "customer",
    "customername",
    "contact",
    "contactname",
    "leadname",
  ],
  firstName: ["firstname", "fname", "givenname", "yourfirstname"],
  lastName: ["lastname", "lname", "surname", "familyname", "yourlastname"],
  email: ["email", "youremail", "emailaddress", "mail", "leademail"],
  phone: [
    "phone",
    "mobile",
    "tel",
    "telephone",
    "phonenumber",
    "yourphone",
    "contactnumber",
    "mobilenumber",
  ],
  company: [
    "company",
    "business",
    "businessname",
    "organization",
    "organisation",
    "yourcompany",
    "companyname",
  ],
  jobTitle: ["jobtitle", "position", "role", "designation", "title"],
  website: ["website", "url", "companywebsite", "yourwebsite"],
  city: ["city", "town"],
  state: ["state", "region", "province"],
  country: ["country"],
  subject: ["subject", "topic", "enquirytype", "enquiry", "inquirytype"],
  message: [
    "message",
    "comments",
    "comment",
    "notes",
    "note",
    "description",
    "enquirymessage",
    "yourmessage",
    "details",
    "body",
  ],
  formName: ["_form_name", "form_name", "form", "form_id_label"],
};

// Build a reverse index: alias-key -> canonical field name.
const REVERSE_INDEX: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) out[canonicalize(a)] = canonical;
  }
  return out;
})();

function canonicalize(key: string): string {
  return key.toLowerCase().replace(/[-_\s.]/g, "");
}

export type MappedWebFormLead = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string;
  jobTitle: string;
  website: string;
  city: string;
  state: string;
  country: string;
  subject: string;
  message: string;
  formName: string | null;
  extra: Record<string, string>;
};

const RESERVED_BODY_KEYS = new Set<string>([
  ...KEY_BODY_FIELDS,
  ...HONEYPOT_FIELDS,
]);

export function mapWebFormSubmission(
  body: WebFormSubmission,
): MappedWebFormLead {
  const canonical: Partial<Record<string, string>> = {};
  const extra: Record<string, string> = {};

  for (const [rawKey, value] of Object.entries(body)) {
    if (!value || !value.trim()) continue;
    if (RESERVED_BODY_KEYS.has(rawKey)) continue;
    const target = REVERSE_INDEX[canonicalize(rawKey)];
    if (target) {
      // Don't overwrite something we already mapped (first-write wins for
      // canonical fields, e.g., if both `name` and `your-name` are present).
      if (canonical[target] === undefined) canonical[target] = value.trim();
    } else {
      extra[rawKey] = value.trim();
    }
  }

  // Compose name from first/last if no whole-name was supplied.
  let name = canonical.name ?? "";
  if (!name) {
    const composed = [canonical.firstName, canonical.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (composed) name = composed;
  }
  // If first/last name fields were used, they also count as "consumed" so they
  // don't end up in the message extras.
  delete canonical.firstName;
  delete canonical.lastName;

  const email = (canonical.email ?? "").toLowerCase() || null;
  const phone = canonical.phone || null;
  const formName = canonical.formName?.trim() || null;
  delete canonical.formName;

  return {
    name:
      name ||
      email ||
      phone ||
      canonical.subject ||
      "Website Lead",
    email,
    phone,
    company: canonical.company ?? "",
    jobTitle: canonical.jobTitle ?? "",
    website: canonical.website ?? "",
    city: canonical.city ?? "",
    state: canonical.state ?? "",
    country: canonical.country ?? "",
    subject: canonical.subject ?? "",
    message: canonical.message ?? "",
    formName,
    extra,
  };
}

// ----------------------------------------------------------------------------
// Note composition
// ----------------------------------------------------------------------------

// Builds the structured first-note body from the mapped submission.
export function composeWebFormNote(mapped: MappedWebFormLead): string {
  const lines: string[] = [];
  if (mapped.subject) lines.push(`Subject: ${mapped.subject}`);
  if (mapped.message) {
    lines.push("");
    lines.push(mapped.message);
  }
  const extras = Object.entries(mapped.extra);
  if (extras.length) {
    if (lines.length) lines.push("");
    lines.push("Additional fields:");
    for (const [k, v] of extras) lines.push(`• ${k}: ${v}`);
  }
  return lines.join("\n").slice(0, 4000); // matches Lead.notes.body maxlength
}

// kebab-cases a string and trims to the Lead tag maxlength (32).
export function tagify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

// Best-effort client-IP extraction. Trusts standard reverse-proxy headers in
// dev; behind a real CDN/proxy this should be tightened to only trust your
// edge's headers.
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
