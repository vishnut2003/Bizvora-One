"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Pause,
  Play,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import { cn } from "@/lib/cn";
import {
  disconnectGoogleAds,
  regenerateGoogleAdsKey,
  setGoogleAdsStatus,
} from "../actions";

export type GoogleAdsCardData =
  | {
      connected: false;
      webhookUrl: string;
    }
  | {
      connected: true;
      accountEmail: string | null;
      webhookUrl: string;
      webhookKey: string;
      status: "active" | "paused";
      lastEventAt: string | null;
      totalLeadsReceived: number;
    };

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

export default function GoogleAdsCard({
  workspaceId,
  data,
  defaultExpanded = false,
}: {
  workspaceId: string;
  data: GoogleAdsCardData;
  defaultExpanded?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ formError?: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.formError) setError(result.formError);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header (button — toggles expansion) */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-start gap-3 p-5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm">
          <PlugZap className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-zinc-900 dark:text-white">
            Google Ads
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            Leads from Google Ads Lead Form ads are created automatically in
            your Leads section.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data.connected ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                data.status === "active"
                  ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25"
                  : "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  data.status === "active" ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {data.status === "active" ? "Active" : "Paused"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
              Not connected
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zinc-400 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* Body (collapsed by default) */}
      {expanded ? (
      <div className="border-t border-zinc-200 px-5 pb-5 pt-4 dark:border-zinc-800">

      {!data.connected ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
            Sign in with the Google account that owns your Google Ads. We&apos;ll
            generate a webhook URL + key for you to paste into your Lead Form
            settings.
          </p>
          <div>
            <a
              href={`/api/integrations/google-ads/oauth/start?workspaceId=${workspaceId}`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-4 text-sm font-medium text-white shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/35"
            >
              <PlugZap className="h-4 w-4" />
              Connect Google Ads
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Connected account & stats */}
          <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-3 dark:bg-zinc-950/60">
            <Stat
              label="Connected as"
              value={data.accountEmail ?? "Google account"}
            />
            <Stat
              label="Leads received"
              value={String(data.totalLeadsReceived)}
            />
            <Stat label="Last event" value={formatRelative(data.lastEventAt)} />
          </div>

          {/* Webhook URL */}
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Webhook URL
            </label>
            <div className="mt-1.5 flex gap-2">
              <Input value={data.webhookUrl} readOnly className="font-mono text-[12.5px]" />
              <CopyButton value={data.webhookUrl} label="webhook URL" />
            </div>
          </div>

          {/* Webhook key */}
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Webhook key
            </label>
            <div className="mt-1.5 flex gap-2">
              <Input
                type={revealed ? "text" : "password"}
                value={data.webhookKey}
                readOnly
                className="font-mono text-[12.5px]"
              />
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
                aria-label={revealed ? "Hide key" : "Reveal key"}
              >
                {revealed ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {revealed ? "Hide" : "Reveal"}
              </button>
              <CopyButton value={data.webhookKey} label="webhook key" />
            </div>
            <p className="mt-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
              Treat this like a password. Regenerate it if it ever leaks.
            </p>
          </div>

          {/* How-to */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              <span>How to set this up in Google Ads</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  helpOpen && "rotate-180",
                )}
              />
            </button>
            {helpOpen ? (
              <ol className="space-y-2 border-t border-zinc-200 px-5 py-4 text-[12.5px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                <li>
                  <span className="font-semibold">1.</span> In Google Ads, open
                  the campaign that runs your Lead Form ad and edit the Lead
                  Form asset.
                </li>
                <li>
                  <span className="font-semibold">2.</span> Scroll to
                  <em> Lead delivery option</em> and choose <em>Webhook</em>.
                </li>
                <li>
                  <span className="font-semibold">3.</span> Paste the
                  <strong> Webhook URL</strong> and <strong>Key</strong> above
                  into the matching fields.
                </li>
                <li>
                  <span className="font-semibold">4.</span> Click{" "}
                  <em>Send test data</em>. A test lead (tagged
                  &ldquo;test&rdquo;) should appear in your Leads section within
                  a few seconds.
                </li>
                <li>
                  <span className="font-semibold">5.</span> Save the Lead Form.
                  Real leads will start flowing in once your ad is live.
                </li>
              </ol>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (
                  !confirm(
                    "Regenerate the webhook key? You'll need to update it in Google Ads.",
                  )
                )
                  return;
                run(() => regenerateGoogleAdsKey(workspaceId));
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate key
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setGoogleAdsStatus(
                    workspaceId,
                    data.status === "active" ? "paused" : "active",
                  ),
                )
              }
            >
              {data.status === "active" ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              onClick={() => {
                if (
                  !confirm(
                    "Disconnect Google Ads? Existing leads stay, but no new leads will be created.",
                  )
                )
                  return;
                run(() => disconnectGoogleAds(workspaceId));
              }}
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          </div>

          {error ? (
            <p className="text-[12px] text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}
        </div>
      )}
      </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
        {value}
      </p>
    </div>
  );
}
