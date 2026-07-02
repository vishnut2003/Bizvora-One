"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Megaphone,
  Pause,
  Play,
  PlugZap,
  Unplug,
} from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import { cn } from "@/lib/cn";
import {
  disconnectMetaAds,
  saveMetaAppCredentials,
  selectMetaPage,
  setMetaAdsStatus,
} from "../actions";

export type MetaAdsCardData =
  | { connected: false }
  | {
      connected: true;
      appId: string | null;
      hasOAuth: boolean;
      accountLabel: string | null;
      pageId: string | null;
      pageName: string | null;
      pendingPages: Array<{ id: string; name: string }>;
      status: "active" | "paused";
      tokenInvalid: boolean;
      lastEventAt: string | null;
      totalLeadsReceived: number;
      webhookUrl: string;
      verifyToken: string;
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

function CredentialsForm({
  workspaceId,
  initialAppId,
  pending,
  onSubmit,
}: {
  workspaceId: string;
  initialAppId: string;
  pending: boolean;
  onSubmit: (
    action: () => Promise<{ formError?: string } | undefined>,
  ) => void;
}) {
  const [appId, setAppId] = useState(initialAppId);
  const [appSecret, setAppSecret] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Meta App ID
        </label>
        <Input
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          placeholder="e.g. 1234567890123456"
          className="mt-1.5 font-mono text-[12.5px]"
        />
      </div>
      <div>
        <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
          Meta App Secret
        </label>
        <Input
          type="password"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          placeholder="Found under App settings → Basic"
          className="mt-1.5 font-mono text-[12.5px]"
        />
        <p className="mt-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
          Stored encrypted. Treat it like a password.
        </p>
      </div>
      <Button
        size="sm"
        disabled={pending || !appId.trim() || !appSecret.trim()}
        onClick={() => {
          onSubmit(() =>
            saveMetaAppCredentials(workspaceId, appId, appSecret),
          );
          setAppSecret("");
        }}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Save credentials
      </Button>
    </div>
  );
}

export default function MetaAdsCard({
  workspaceId,
  data,
  oauthRedirectUri,
  defaultExpanded = false,
}: {
  workspaceId: string;
  data: MetaAdsCardData;
  oauthRedirectUri: string;
  defaultExpanded?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectHref = `/api/integrations/meta-ads/oauth/start?workspaceId=${workspaceId}`;

  function run(action: () => Promise<{ formError?: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.formError) setError(result.formError);
      else setEditingCredentials(false);
    });
  }

  const needsPageSelection =
    data.connected && !data.pageId && data.pendingPages.length > 0;
  const needsFacebookLogin =
    data.connected && !data.pageId && data.pendingPages.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header (button — toggles expansion) */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-start gap-3 p-5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
          <Megaphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-zinc-900 dark:text-white">
            Meta Ads
          </h2>
          <p className="mt-0.5 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            Leads from Facebook &amp; Instagram Lead Ads are created
            automatically in your Leads section.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data.connected && data.pageId ? (
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
          ) : data.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25">
              Setup incomplete
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
            <div className="space-y-4">
              <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
                Create your own Meta app at{" "}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  developers.facebook.com
                </a>{" "}
                and paste its credentials below. You&apos;ll then sign in with
                Facebook to pick the Page that runs your Lead Ads. Full steps
                are in the setup guide below.
              </p>
              <CredentialsForm
                workspaceId={workspaceId}
                initialAppId=""
                pending={pending}
                onSubmit={run}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {data.tokenInvalid ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  Facebook revoked our access to your page — leads are not
                  being received.{" "}
                  <a href={connectHref} className="font-semibold underline">
                    Reconnect with Facebook
                  </a>
                </div>
              ) : null}

              {needsFacebookLogin ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
                    App credentials saved. Now sign in with the Facebook
                    account that manages your business Page.
                  </p>
                  <div>
                    <a
                      href={connectHref}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-gradient-to-r from-primary to-secondary px-4 text-sm font-medium text-white shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/35"
                    >
                      <PlugZap className="h-4 w-4" />
                      Connect with Facebook
                    </a>
                  </div>
                </div>
              ) : needsPageSelection ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
                    You manage more than one Facebook Page. Choose the one that
                    runs your Lead Ads:
                  </p>
                  <div className="space-y-1.5">
                    {data.pendingPages.map((page) => (
                      <label
                        key={page.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[13px]",
                          selectedPageId === page.id
                            ? "border-primary/50 bg-primary/[0.04] dark:bg-primary/[0.08]"
                            : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40",
                        )}
                      >
                        <input
                          type="radio"
                          name="meta-page"
                          value={page.id}
                          checked={selectedPageId === page.id}
                          onChange={() => setSelectedPageId(page.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-zinc-800 dark:text-zinc-200">
                            {page.name || "Untitled page"}
                          </span>
                          <span className="block text-[11.5px] text-zinc-400 dark:text-zinc-500">
                            Page ID: {page.id}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    disabled={pending || !selectedPageId}
                    onClick={() => {
                      if (!selectedPageId) return;
                      run(() => selectMetaPage(workspaceId, selectedPageId));
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Connect this page
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2 dark:bg-zinc-950/60">
                  <Stat
                    label="Connected as"
                    value={data.accountLabel ?? "Facebook account"}
                  />
                  <Stat
                    label="Facebook Page"
                    value={data.pageName ?? "No page selected"}
                  />
                  <Stat
                    label="Leads received"
                    value={String(data.totalLeadsReceived)}
                  />
                  <Stat
                    label="Last event"
                    value={formatRelative(data.lastEventAt)}
                  />
                </div>
              )}

              {/* Webhook URL — pasted once into the tenant's Meta App Dashboard */}
              <div>
                <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                  Webhook callback URL
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

              {/* Verify token */}
              <div>
                <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                  Webhook verify token
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    type={revealed ? "text" : "password"}
                    value={data.verifyToken}
                    readOnly
                    className="font-mono text-[12.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
                    aria-label={revealed ? "Hide token" : "Reveal token"}
                  >
                    {revealed ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {revealed ? "Hide" : "Reveal"}
                  </button>
                  <CopyButton value={data.verifyToken} label="verify token" />
                </div>
                <p className="mt-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  Enter this as the &ldquo;Verify token&rdquo; when configuring
                  Webhooks in your Meta App Dashboard.
                </p>
              </div>

              {/* Update credentials */}
              {editingCredentials ? (
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <CredentialsForm
                    workspaceId={workspaceId}
                    initialAppId={data.appId ?? ""}
                    pending={pending}
                    onSubmit={run}
                  />
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => setEditingCredentials((v) => !v)}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {editingCredentials ? "Cancel" : "Update app credentials"}
                </Button>

                {data.pageId ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        setMetaAdsStatus(
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
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  onClick={() => {
                    if (
                      !confirm(
                        "Disconnect Meta Ads? Existing leads stay, but no new leads will be created.",
                      )
                    )
                      return;
                    run(() => disconnectMetaAds(workspaceId));
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

          {/* How-to (shown in every state) */}
          <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              <span>How to set this up in Meta</span>
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
                  <span className="font-semibold">1.</span> Go to{" "}
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                  >
                    developers.facebook.com
                  </a>{" "}
                  and create an app (type <em>Business</em>). Add the{" "}
                  <em>Facebook Login for Business</em> and <em>Webhooks</em>{" "}
                  products.
                </li>
                <li>
                  <span className="font-semibold">2.</span> Copy the{" "}
                  <strong>App ID</strong> and <strong>App Secret</strong> from{" "}
                  <em>App settings → Basic</em> and save them in this card.
                </li>
                <li>
                  <span className="font-semibold">3.</span> Under{" "}
                  <em>Facebook Login → Settings</em>, add this to{" "}
                  <em>Valid OAuth Redirect URIs</em>:
                  <span className="mt-1 block break-all rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11.5px] dark:bg-zinc-800">
                    {oauthRedirectUri}
                  </span>
                </li>
                <li>
                  <span className="font-semibold">4.</span> Under{" "}
                  <em>Webhooks</em>, choose the <em>Page</em> object and
                  subscribe to the <strong>leadgen</strong> field using the{" "}
                  <strong>Webhook callback URL</strong> and{" "}
                  <strong>Verify token</strong> shown above.
                </li>
                <li>
                  <span className="font-semibold">5.</span> Click{" "}
                  <em>Connect with Facebook</em> here and pick your Page. Send
                  a test lead from the{" "}
                  <a
                    href="https://developers.facebook.com/tools/lead-ads-testing"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                  >
                    Lead Ads Testing Tool
                  </a>{" "}
                  — it appears in your Leads section tagged &ldquo;test&rdquo;.
                </li>
                <li>
                  <span className="font-semibold">6.</span> Note: the{" "}
                  <em>leads_retrieval</em> permission works immediately in
                  Development Mode for people with a role on your app. To
                  receive leads with the app in Live Mode, complete Meta App
                  Review + business verification.
                </li>
              </ol>
            ) : null}
          </div>
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
