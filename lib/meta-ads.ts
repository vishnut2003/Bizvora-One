import "server-only";
import crypto from "crypto";
import { safeEqualString } from "@/lib/integration";
import type { LeadPriority } from "@/lib/lead";

// Multi-tenant: every workspace registers its OWN Meta developer app and
// stores its App ID + App Secret (encrypted) on the Integration document, so
// every helper here takes the credentials as arguments — there is no
// platform-level Meta app or env var.

// Cookie that holds the OAuth nonce for CSRF protection during the
// authorization flow. Validated in the callback against the `state` param.
export const OAUTH_NONCE_COOKIE = "wss_meta_oauth";
export const OAUTH_NONCE_TTL_S = 600; // 10 minutes

export const META_GRAPH_VERSION = "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const FACEBOOK_DIALOG_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

// leads_retrieval + pages_manage_metadata require Meta App Review for
// production; in Development Mode they work for users with a role on the
// tenant's app — enough for a business connecting its own pages.
export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
];

export function getMetaRedirectUri(): string {
  const base = (process.env.AUTH_URL ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("AUTH_URL must be set for Meta Ads OAuth.");
  return `${base}/api/integrations/meta-ads/oauth/callback`;
}

export function buildMetaAuthUrl(appId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getMetaRedirectUri(),
    response_type: "code",
    scope: META_OAUTH_SCOPES.join(","),
    state,
  });
  return `${FACEBOOK_DIALOG_URL}?${params.toString()}`;
}

// ---------- OAuth token helpers ----------

type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export async function exchangeCodeForToken(
  appId: string,
  appSecret: string,
  code: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: getMetaRedirectUri(),
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as MetaTokenResponse;
}

// Short-lived user tokens last ~1-2 hours; long-lived ones ~60 days. Page
// tokens derived from a long-lived user token effectively never expire.
export async function exchangeForLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta long-lived exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as MetaTokenResponse;
}

export async function fetchMetaUser(
  accessToken: string,
): Promise<{ id: string; name: string } | null> {
  const params = new URLSearchParams({
    fields: "id,name",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string; name?: string };
  if (typeof data.id !== "string") return null;
  return { id: data.id, name: typeof data.name === "string" ? data.name : "" };
}

// ---------- Pages & webhook subscription ----------

export type MetaPage = { id: string; name: string; access_token: string };

export async function listPages(userToken: string): Promise<MetaPage[]> {
  const pages: MetaPage[] = [];
  let url: string | null =
    `${GRAPH_BASE}/me/accounts?${new URLSearchParams({
      fields: "id,name,access_token",
      limit: "100",
      access_token: userToken,
    })}`;
  // Follow pagination defensively; nobody manages 1000+ pages, so cap it.
  for (let i = 0; i < 10 && url; i += 1) {
    const res: Response = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Meta /me/accounts failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as {
      data?: Array<{ id?: string; name?: string; access_token?: string }>;
      paging?: { next?: string };
    };
    for (const p of data.data ?? []) {
      if (typeof p.id === "string" && typeof p.access_token === "string") {
        pages.push({
          id: p.id,
          name: typeof p.name === "string" ? p.name : "",
          access_token: p.access_token,
        });
      }
    }
    url = data.paging?.next ?? null;
  }
  return pages;
}

// Subscribes the tenant's app to the page's leadgen webhook events.
export async function subscribePageToLeadgen(
  pageId: string,
  pageToken: string,
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      subscribed_fields: "leadgen",
      access_token: pageToken,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean };
  if (!res.ok || data.success !== true) {
    throw new Error(
      `Meta page subscription failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
}

// Best-effort cleanup on disconnect; callers should not fail on errors here.
export async function unsubscribePage(
  pageId: string,
  pageToken: string,
): Promise<void> {
  await fetch(
    `${GRAPH_BASE}/${pageId}/subscribed_apps?${new URLSearchParams({
      access_token: pageToken,
    })}`,
    { method: "DELETE" },
  );
}

// ---------- Lead retrieval ----------

export type MetaLeadDetails = {
  id: string;
  created_time?: string;
  field_data?: Array<{ name?: string; values?: string[] }>;
  form_id?: string;
  campaign_id?: string;
  ad_id?: string;
  is_organic?: boolean;
};

export type MetaLeadFetchResult =
  | { ok: true; details: MetaLeadDetails }
  | { ok: false; kind: "auth" | "not_found" | "transient"; message: string };

// The webhook only carries a leadgen_id; the actual answers must be fetched
// from the Graph API. Returns a classified error instead of throwing so the
// webhook route can decide whether a retry could ever succeed.
export async function fetchLeadgen(
  leadgenId: string,
  pageToken: string,
): Promise<MetaLeadFetchResult> {
  const params = new URLSearchParams({
    fields: "id,created_time,field_data,form_id,campaign_id,ad_id,is_organic",
    access_token: pageToken,
  });
  let res: Response;
  try {
    res = await fetch(`${GRAPH_BASE}/${leadgenId}?${params}`);
  } catch (err) {
    return { ok: false, kind: "transient", message: String(err) };
  }

  if (res.ok) {
    const details = (await res.json()) as MetaLeadDetails;
    return { ok: true, details };
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; error_subcode?: number };
  };
  const code = body.error?.code ?? 0;
  const message = body.error?.message ?? `HTTP ${res.status}`;

  // 190 = invalid/expired token; 200-299 = missing permissions, 10 = app
  // lacks the capability. Retrying with the same token can never succeed.
  if (code === 190 || code === 10 || (code >= 200 && code <= 299)) {
    return { ok: false, kind: "auth", message };
  }
  // 100 = unknown object (the dashboard "Test" button sends a fake
  // leadgen_id), 803 = alias doesn't exist. Nothing to fetch — drop it.
  if (code === 100 || code === 803 || res.status === 404) {
    return { ok: false, kind: "not_found", message };
  }
  // Rate limits (4, 17, 32, 613) and 5xx are worth a redelivery.
  return { ok: false, kind: "transient", message };
}

// ---------- Field mapping ----------

export type MetaMappedLead = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string;
  jobTitle: string;
  website: string;
  city: string;
  state: string;
  country: string;
  priority: LeadPriority;
  tags: string[];
  externalId: string;
  formId: string | null;
  campaignId: string | null;
  adId: string | null;
  isTest: boolean;
  // Custom form questions we don't have a lead field for; the webhook route
  // turns these into a note.
  noteBody: string;
};

// Standard field names Meta emits for its prefill questions. Anything not in
// this set is a custom question and gets captured into the lead's note.
const KNOWN_FIELDS = new Set([
  "full_name",
  "first_name",
  "last_name",
  "email",
  "phone_number",
  "company_name",
  "job_title",
  "website",
  "city",
  "state",
  "province",
  "country",
  "street_address",
]);

function pickField(fields: Map<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = fields.get(name);
    if (value) return value;
  }
  return "";
}

// The Lead Ads Testing Tool submits dummy data with this email; treat those
// like Google's is_test leads (tagged, no AI call).
export function isMetaTestLead(details: MetaLeadDetails): boolean {
  for (const entry of details.field_data ?? []) {
    for (const value of entry.values ?? []) {
      const v = value.toLowerCase();
      if (v === "test@fb.com" || v.startsWith("test lead: dummy data")) {
        return true;
      }
    }
  }
  return false;
}

export function mapFieldDataToLead(
  details: MetaLeadDetails,
  defaults: { priority: LeadPriority; tags: string[] },
): MetaMappedLead {
  const fields = new Map<string, string>();
  const custom: Array<{ question: string; answer: string }> = [];

  for (const entry of details.field_data ?? []) {
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    const value = (entry.values ?? [])
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .join(", ")
      .trim();
    if (!value) continue;
    const key = name.toLowerCase();
    if (KNOWN_FIELDS.has(key)) {
      fields.set(key, value);
    } else {
      custom.push({ question: name.replace(/_/g, " "), answer: value });
    }
  }

  const fullName =
    pickField(fields, "full_name") ||
    [pickField(fields, "first_name"), pickField(fields, "last_name")]
      .filter(Boolean)
      .join(" ")
      .trim();

  const email = pickField(fields, "email").toLowerCase();
  const phone = pickField(fields, "phone_number");
  const isTest = isMetaTestLead(details);

  const tagSet = new Set<string>(defaults.tags);
  tagSet.add("meta-ads");
  if (isTest) tagSet.add("test");

  const noteBody = custom.length
    ? custom
        .map((c) => `${c.question}: ${c.answer}`)
        .join("\n")
        .slice(0, 4000)
    : "";

  return {
    name: fullName || email || phone || "Meta Lead",
    email: email || null,
    phone: phone || null,
    company: pickField(fields, "company_name"),
    jobTitle: pickField(fields, "job_title"),
    website: pickField(fields, "website"),
    city: pickField(fields, "city"),
    state: pickField(fields, "state", "province"),
    country: pickField(fields, "country"),
    priority: defaults.priority,
    tags: Array.from(tagSet).slice(0, 20),
    externalId: details.id,
    formId: details.form_id ?? null,
    campaignId: details.campaign_id ?? null,
    adId: details.ad_id ?? null,
    isTest,
    noteBody,
  };
}

// ---------- Webhook verification ----------

export type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{
      field?: string;
      value?: {
        leadgen_id?: string | number;
        page_id?: string | number;
        form_id?: string | number;
        ad_id?: string | number;
        created_time?: number;
      };
    }>;
  }>;
};

// Meta signs every webhook POST with the app secret over the raw body.
export function verifyMetaWebhookSignature(
  appSecret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqualString(signatureHeader, expected);
}
