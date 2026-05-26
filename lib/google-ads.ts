import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/integration";
import type { LeadPriority } from "@/lib/lead";

// https://support.google.com/google-ads/answer/9923987 — Lead Form webhook payload.
export type GoogleAdsLeadColumn = {
  column_name?: string;
  string_value?: string;
  column_id?: string;
};

export type GoogleAdsLeadPayload = {
  lead_id?: string;
  user_column_data?: GoogleAdsLeadColumn[];
  api_version?: string;
  form_id?: number | string;
  campaign_id?: number | string;
  google_key?: string;
  is_test?: boolean;
  gcl_id?: string;
  // Sometimes adjacent fields like adgroup_id, asset_id, creative_id appear;
  // we don't rely on them yet.
};

// Cookie that holds the OAuth nonce for CSRF protection during the
// authorization flow. Validated in the callback against the `state` param.
export const OAUTH_NONCE_COOKIE = "wss_gads_oauth";
export const OAUTH_NONCE_TTL_S = 600; // 10 minutes

export const GOOGLE_ADS_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "openid",
  "email",
];

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export type MappedLead = {
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
  gclid: string | null;
  isTest: boolean;
};

function pickColumn(
  cols: GoogleAdsLeadColumn[] | undefined,
  id: string,
): string {
  if (!cols) return "";
  const found = cols.find(
    (c) => typeof c.column_id === "string" && c.column_id.toUpperCase() === id,
  );
  return typeof found?.string_value === "string" ? found.string_value.trim() : "";
}

function asString(value: number | string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

// Google's Lead Form column IDs we know how to handle. Anything else gets
// captured into the lead's notes / activity by the webhook route.
// Reference: https://support.google.com/google-ads/answer/9923987 (table of column_ids)
export function mapPayloadToLead(
  payload: GoogleAdsLeadPayload,
  defaults: { priority: LeadPriority; tags: string[] },
): MappedLead | null {
  const externalId = asString(payload.lead_id);
  if (!externalId) return null;

  const cols = payload.user_column_data;

  const fullName =
    pickColumn(cols, "FULL_NAME") ||
    [pickColumn(cols, "FIRST_NAME"), pickColumn(cols, "LAST_NAME")]
      .filter(Boolean)
      .join(" ")
      .trim();

  const email = pickColumn(cols, "EMAIL").toLowerCase();
  const phone = pickColumn(cols, "PHONE_NUMBER");
  const company = pickColumn(cols, "COMPANY_NAME");
  const jobTitle = pickColumn(cols, "JOB_TITLE") || pickColumn(cols, "WORK_TITLE");
  const website = pickColumn(cols, "WORK_WEBSITE") || pickColumn(cols, "WEBSITE");
  const city = pickColumn(cols, "CITY");
  const state = pickColumn(cols, "REGION") || pickColumn(cols, "STATE");
  const country = pickColumn(cols, "COUNTRY");

  const tagSet = new Set<string>(defaults.tags);
  tagSet.add("google-ads");
  if (payload.is_test === true) tagSet.add("test");

  return {
    name: fullName || email || phone || "Google Ads Lead",
    email: email || null,
    phone: phone || null,
    company,
    jobTitle,
    website,
    city,
    state,
    country,
    priority: defaults.priority,
    tags: Array.from(tagSet).slice(0, 20),
    externalId,
    formId: asString(payload.form_id),
    campaignId: asString(payload.campaign_id),
    gclid: asString(payload.gcl_id),
    isTest: payload.is_test === true,
  };
}

// ---------- OAuth helpers ----------

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export function buildGoogleAdsAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const redirectUri = getRedirectUri();
  if (!clientId) {
    throw new Error("GOOGLE_ADS_OAUTH_CLIENT_ID is not set.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_ADS_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    // Forces Google to re-issue a refresh_token even on repeat consent.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export function getRedirectUri(): string {
  const base = (process.env.AUTH_URL ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("AUTH_URL must be set for Google Ads OAuth.");
  return `${base}/api/integrations/google-ads/oauth/callback`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Ads OAuth client credentials are not configured.");
  }
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(
  encryptedRefreshToken: string,
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Ads OAuth client credentials are not configured.");
  }
  const refreshToken = decryptSecret(encryptedRefreshToken);
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserEmail(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return typeof data.email === "string" ? data.email.toLowerCase() : null;
}

// Wraps a plaintext refresh token for storage. Use this only from server code.
export function wrapRefreshTokenForStorage(plaintext: string | undefined): string {
  if (!plaintext) return "";
  return encryptSecret(plaintext);
}
