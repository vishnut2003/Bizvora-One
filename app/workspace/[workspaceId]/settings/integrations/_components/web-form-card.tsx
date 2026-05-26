"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Pause,
  Play,
  RefreshCw,
  Unplug,
} from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import { cn } from "@/lib/cn";
import {
  connectWebForm,
  disconnectWebForm,
  regenerateWebFormKey,
  setWebFormStatus,
} from "../actions";
import WebFormSetupGuides from "./web-form-setup-guides";

export type WebFormCardData =
  | {
      connected: false;
      webhookUrl: string;
    }
  | {
      connected: true;
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

export default function WebFormCard({
  workspaceId,
  data,
}: {
  workspaceId: string;
  data: WebFormCardData;
}) {
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
          <Globe className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-zinc-900 dark:text-white">
            Web Forms
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            Capture leads from WordPress form plugins (Fluent Forms, Elementor,
            CF7, Gravity, WPForms) or any custom site that can POST a webhook.
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
            Generate a webhook URL and key, then paste them into your form
            plugin&apos;s webhook settings. Leads come in tagged{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11.5px] dark:bg-zinc-800">
              web-form
            </code>{" "}
            with <strong>source = Website</strong>.
          </p>
          <div>
            <Button
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={() => run(() => connectWebForm(workspaceId))}
            >
              <Globe className="h-3.5 w-3.5" />
              Generate webhook
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2 dark:bg-zinc-950/60">
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
              <Input
                value={data.webhookUrl}
                readOnly
                className="font-mono text-[12.5px]"
              />
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
              Send this as the <code className="font-mono">X-Webhook-Key</code>{" "}
              header, or as a <code className="font-mono">_webhook_key</code>{" "}
              body field for plugins that can&apos;t set custom headers.
              Regenerate it if it ever leaks.
            </p>
          </div>

          {/* How-to (with per-plugin tabs) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              <span>How to set this up in your form plugin</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  helpOpen && "rotate-180",
                )}
              />
            </button>
            {helpOpen ? (
              <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                <WebFormSetupGuides
                  webhookUrl={data.webhookUrl}
                  webhookKey={data.webhookKey}
                />
              </div>
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
                    "Regenerate the webhook key? You'll need to update it in your form plugin.",
                  )
                )
                  return;
                run(() => regenerateWebFormKey(workspaceId));
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
                  setWebFormStatus(
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
                    "Disconnect Web Forms? Existing leads stay, but no new submissions will be ingested.",
                  )
                )
                  return;
                run(() => disconnectWebForm(workspaceId));
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
