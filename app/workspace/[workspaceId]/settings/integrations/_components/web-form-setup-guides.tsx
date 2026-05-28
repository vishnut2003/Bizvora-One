"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type GuideKey =
  | "fluent"
  | "elementor"
  | "cf7"
  | "gravity"
  | "wpforms"
  | "other";

const TABS: { key: GuideKey; label: string }[] = [
  { key: "fluent", label: "Fluent Forms" },
  { key: "elementor", label: "Elementor" },
  { key: "cf7", label: "Contact Form 7" },
  { key: "gravity", label: "Gravity Forms" },
  { key: "wpforms", label: "WPForms" },
  { key: "other", label: "Other / cURL" },
];

export default function WebFormSetupGuides({
  webhookUrl,
  webhookKey,
}: {
  webhookUrl: string;
  webhookKey: string;
}) {
  const [tab, setTab] = useState<GuideKey>("fluent");

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 p-1.5 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              tab === t.key
                ? "bg-primary/10 text-primary dark:bg-primary/15"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="px-5 py-4 text-[12.5px] text-zinc-700 dark:text-zinc-300">
        {tab === "fluent" ? (
          <FluentGuide url={webhookUrl} k={webhookKey} />
        ) : tab === "elementor" ? (
          <ElementorGuide url={webhookUrl} k={webhookKey} />
        ) : tab === "cf7" ? (
          <CF7Guide url={webhookUrl} k={webhookKey} />
        ) : tab === "gravity" ? (
          <GravityGuide url={webhookUrl} k={webhookKey} />
        ) : tab === "wpforms" ? (
          <WPFormsGuide url={webhookUrl} k={webhookKey} />
        ) : (
          <OtherGuide url={webhookUrl} k={webhookKey} />
        )}
      </div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="ml-4 list-decimal space-y-1.5">{children}</ol>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11.5px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </code>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-[11.5px] leading-relaxed text-zinc-100 dark:bg-zinc-950">
      {children}
    </pre>
  );
}

function FluentGuide({ url, k }: { url: string; k: string }) {
  return (
    <div className="space-y-3">
      <p>
        Fluent Forms Free includes a built-in <em>Webhook</em> integration —
        no paid add-on needed.
      </p>
      <Steps>
        <li>
          WP Admin → <em>Fluent Forms</em> → open the form → <em>Settings &amp;
          Integrations</em>.
        </li>
        <li>
          <em>All Integrations</em> → <em>+ Add New Integration</em> →{" "}
          <em>Webhook</em>.
        </li>
        <li>
          <strong>Name:</strong> <Code>BizvoraOne</Code>
          <br />
          <strong>Request URL:</strong> <Code>{url}</Code>
          <br />
          <strong>Method:</strong> <Code>POST</Code>
          <br />
          <strong>Format:</strong> <Code>JSON</Code>
        </li>
        <li>
          <em>Request Headers</em> → <em>Add Header</em>:
          <br />
          Name <Code>X-Webhook-Key</Code>, Value <Code>{k}</Code>.
        </li>
        <li>
          Leave <em>Request Body</em> on <em>Use Form Field Data</em>. Save.
        </li>
      </Steps>
    </div>
  );
}

function ElementorGuide({ url, k }: { url: string; k: string }) {
  return (
    <div className="space-y-3">
      <p>
        Elementor <strong>Pro</strong>&apos;s form widget has a built-in Webhook
        action. The free version doesn&apos;t include the form widget at all.
      </p>
      <Steps>
        <li>Edit the page → select the Form widget → <em>Content</em> tab.</li>
        <li>
          <em>Actions After Submit</em> → click <em>+ Add Action</em> → choose{" "}
          <em>Webhook</em>.
        </li>
        <li>
          A new <em>Webhook</em> panel appears below. Paste{" "}
          <Code>{url}</Code> into the <em>Webhook URL</em> field.
        </li>
        <li>
          Turn <em>Advanced Data</em> ON (lets us pick up the form name and
          page URL).
        </li>
        <li>
          Add a <em>Hidden field</em> to the form with the field ID{" "}
          <Code>_webhook_key</Code> and default value <Code>{k}</Code>.
          Elementor doesn&apos;t expose a custom-header UI, so we use the body
          fallback.
        </li>
        <li>Publish.</li>
      </Steps>
      <p className="text-zinc-500 dark:text-zinc-400">
        Note: the key in a hidden field is visible to anyone viewing the
        page&apos;s HTML. If that matters, use a CDN/Edge worker on your site to
        inject the <Code>X-Webhook-Key</Code> header server-side instead.
      </p>
    </div>
  );
}

function CF7Guide({ url, k }: { url: string; k: string }) {
  return (
    <div className="space-y-3">
      <p>
        Contact Form 7 doesn&apos;t ship webhooks. Install the free plugin{" "}
        <strong>CF7 to Webhook</strong> by Mr. Kishan Patadia (or any of the
        similar free addons).
      </p>
      <Steps>
        <li>
          WP Admin → <em>Plugins → Add New</em> → search{" "}
          <Code>CF7 to Webhook</Code> → install &amp; activate.
        </li>
        <li>
          Open your form → <em>Webhook</em> tab.
        </li>
        <li>
          <em>Send to Webhook?</em> ON. <em>Webhook URL:</em>{" "}
          <Code>{url}</Code>. <em>Send as JSON?</em> ON.
        </li>
        <li>
          In the form&apos;s <em>Form</em> tab add a hidden tag so the key
          travels with each submission:
          <Block>{`[hidden _webhook_key "${k}"]`}</Block>
        </li>
        <li>Save the form.</li>
      </Steps>
    </div>
  );
}

function GravityGuide({ url, k }: { url: string; k: string }) {
  return (
    <div className="space-y-3">
      <p>
        Gravity Forms ships the official <em>Webhooks Add-On</em> on the
        Elite/Pro tiers. (Free alternative: the &ldquo;HTTP API for Gravity
        Forms&rdquo; plugin.)
      </p>
      <Steps>
        <li>Form → <em>Settings → Webhooks → Add New</em>.</li>
        <li>
          <strong>Name:</strong> <Code>BizvoraOne</Code>
          <br />
          <strong>Request URL:</strong> <Code>{url}</Code>
          <br />
          <strong>Method:</strong> POST. <strong>Format:</strong> JSON.
        </li>
        <li>
          <em>Custom Headers</em> → add{" "}
          <Code>X-Webhook-Key: {k}</Code>.
        </li>
        <li>
          <em>Request Body</em>: <em>All Fields</em>.
        </li>
        <li>Save.</li>
      </Steps>
    </div>
  );
}

function WPFormsGuide({ url, k }: { url: string; k: string }) {
  return (
    <div className="space-y-3">
      <p>
        WPForms&apos; Webhooks addon ships with the <strong>Plus</strong>{" "}
        license and above. WPForms Lite doesn&apos;t include it.
      </p>
      <Steps>
        <li>
          WP Admin → <em>WPForms → Addons</em> → install{" "}
          <em>Webhooks Addon</em>.
        </li>
        <li>
          Edit the form → <em>Settings → Webhooks → Add New Webhook</em>.
        </li>
        <li>
          <strong>Name:</strong> <Code>BizvoraOne</Code>
          <br />
          <strong>Request URL:</strong> <Code>{url}</Code>
          <br />
          <strong>Method:</strong> POST. <strong>Format:</strong> JSON.
        </li>
        <li>
          <em>Request Headers</em> → add{" "}
          <Code>X-Webhook-Key: {k}</Code>.
        </li>
        <li>Save.</li>
      </Steps>
    </div>
  );
}

function OtherGuide({ url, k }: { url: string; k: string }) {
  return (
    <div className="space-y-3">
      <p>
        The endpoint accepts any of JSON, url-encoded, and multipart bodies.
        Send the key as an <Code>X-Webhook-Key</Code> header, or as a{" "}
        <Code>_webhook_key</Code> field in the body.
      </p>
      <Block>{`curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Key: ${k}" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+91-9876543210",
    "company": "Acme Corp",
    "message": "I'd like a quote",
    "_form_name": "Contact"
  }'`}</Block>
      <p className="text-zinc-500 dark:text-zinc-400">
        Recognized fields:{" "}
        <Code>name</Code>, <Code>email</Code>, <Code>phone</Code>,{" "}
        <Code>company</Code>, <Code>jobTitle</Code>, <Code>website</Code>,{" "}
        <Code>city</Code>, <Code>state</Code>, <Code>country</Code>,{" "}
        <Code>subject</Code>, <Code>message</Code>. Add{" "}
        <Code>_form_name</Code> to tag the source form. Anything else is
        captured into the lead&apos;s first note.
      </p>
    </div>
  );
}
