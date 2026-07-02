import "server-only";
import crypto from "crypto";
import type { UserRole } from "@/lib/user";

export const INTEGRATION_PROVIDERS = [
  "google_ads",
  "web_form",
  "meta_ads",
] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  google_ads: "Google Ads",
  web_form: "Web Forms",
  meta_ads: "Meta Ads",
};

export const INTEGRATION_MANAGER_ROLES: UserRole[] = ["owner", "admin"];

export function canManageIntegrations(role: UserRole): boolean {
  return INTEGRATION_MANAGER_ROLES.includes(role);
}

// Google Ads' Lead Form webhook key field accepts up to 50 chars. 25 random
// bytes hex-encoded fits exactly and still gives ~200 bits of entropy.
export function generateWebhookKey(): string {
  return crypto.randomBytes(25).toString("hex");
}

export function generateNonce(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// AES-256-GCM symmetric encryption for OAuth refresh tokens at rest.
// Ciphertext format: base64(iv ‖ authTag ‖ encrypted).
const ENC_ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM-recommended IV length
const TAG_LEN = 16;

function getEncKey(): Buffer {
  const raw = process.env.INTEGRATION_ENC_KEY;
  if (!raw) {
    throw new Error(
      "INTEGRATION_ENC_KEY is not set. Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` and add it to .env.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `INTEGRATION_ENC_KEY must decode to 32 bytes, got ${key.length}`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = getEncKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return "";
  const key = getEncKey();
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Ciphertext is too short to be valid.");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

// Length-safe constant-time comparison. timingSafeEqual throws if buffer
// lengths differ, so we check first and return false instead.
export function safeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// The base URL used to build webhook URLs shown to users. Falls back to
// AUTH_URL so dev "just works" without extra config.
export function getPublicBaseUrl(): string {
  const value = process.env.PUBLIC_BASE_URL || process.env.AUTH_URL || "";
  return value.replace(/\/+$/, "");
}
