import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in environment variables`);
  return value;
}

const RESEND_API_KEY = requiredEnv("RESEND_API_KEY");
const RESEND_EMAIL = requiredEnv("RESEND_EMAIL");

// The display name inboxes show as the sender. Resend accepts the
// "Name <email>" format. If RESEND_EMAIL already carries a display name we
// respect it; otherwise we prefix the brand so recipients see "BizvoraOne"
// instead of the bare address local-part (e.g. "no-replay").
const FROM_NAME = process.env.RESEND_FROM_NAME || "BizvoraOne";
const FROM_EMAIL = RESEND_EMAIL.includes("<")
  ? RESEND_EMAIL
  : `${FROM_NAME} <${RESEND_EMAIL}>`;

// Instantiate the Resend client once at module scope so it is reused across
// invocations in the serverless runtime.
const resend = new Resend(RESEND_API_KEY);

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** Optional override for the default RESEND_EMAIL sender. */
  from?: string;
  replyTo?: string | string[];
};

/**
 * Reusable transactional email sender backed by Resend. Renders a React Email
 * component to HTML and dispatches it. Throws on failure so callers can decide
 * how to surface the error.
 */
export async function sendEmail({
  to,
  subject,
  react,
  from = FROM_EMAIL,
  replyTo,
}: SendEmailOptions) {
  // Render the React Email component to HTML (and a plain-text fallback)
  // ourselves rather than letting the Resend SDK dynamically import
  // `@react-email/render`, which the bundler can't resolve at runtime.
  const html = await render(react);
  const text = await render(react, { plainText: true });

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
