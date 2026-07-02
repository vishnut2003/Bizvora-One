import type { Metadata } from "next";
import { PlugZap } from "lucide-react";
import { connectDB } from "@/config/db";
import Integration from "@/models/integration";
import { INTEGRATION_MANAGER_ROLES, getPublicBaseUrl } from "@/lib/integration";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import DashboardLayout from "@/layouts/dashboard-layout";
import GoogleAdsCard, {
  type GoogleAdsCardData,
} from "./_components/google-ads-card";
import MetaAdsCard, {
  type MetaAdsCardData,
} from "./_components/meta-ads-card";
import WebFormCard, {
  type WebFormCardData,
} from "./_components/web-form-card";

export const metadata: Metadata = {
  title: "Integrations — BizvoraOne",
};

type IntegrationsPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ "google-ad"?: string; "meta-ad"?: string }>;
};

export default async function IntegrationsPage({
  params,
  searchParams,
}: IntegrationsPageProps) {
  const { workspaceId } = await params;
  const search = await searchParams;
  const googleAdResult = search["google-ad"];
  const metaAdResult = search["meta-ad"];

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: INTEGRATION_MANAGER_ROLES,
  });

  await connectDB();
  const [googleAdsIntegration, metaAdsIntegration, webFormIntegration] =
    await Promise.all([
      Integration.findOne({
        workspace: workspaceId,
        provider: "google_ads",
      }).lean(),
      Integration.findOne({
        workspace: workspaceId,
        provider: "meta_ads",
      }).lean(),
      Integration.findOne({
        workspace: workspaceId,
        provider: "web_form",
      }).lean(),
    ]);

  const base = getPublicBaseUrl();
  const googleAdsWebhookUrl = base
    ? `${base}/api/webhooks/google-ads/${workspaceId}`
    : `/api/webhooks/google-ads/${workspaceId}`;
  const webFormWebhookUrl = base
    ? `${base}/api/webhooks/web-form/${workspaceId}`
    : `/api/webhooks/web-form/${workspaceId}`;
  const metaAdsWebhookUrl = base
    ? `${base}/api/webhooks/meta-ads/${workspaceId}`
    : `/api/webhooks/meta-ads/${workspaceId}`;
  // The tenant adds this to their Meta app's Valid OAuth Redirect URIs.
  const metaOauthRedirectUri = base
    ? `${base}/api/integrations/meta-ads/oauth/callback`
    : `/api/integrations/meta-ads/oauth/callback`;

  const googleAdsData: GoogleAdsCardData = googleAdsIntegration
    ? {
        connected: true,
        accountEmail: googleAdsIntegration.oauth?.accountEmail ?? null,
        webhookUrl: googleAdsWebhookUrl,
        webhookKey: googleAdsIntegration.webhookKey,
        status: googleAdsIntegration.status as "active" | "paused",
        lastEventAt: googleAdsIntegration.lastEventAt
          ? new Date(googleAdsIntegration.lastEventAt).toISOString()
          : null,
        totalLeadsReceived: googleAdsIntegration.totalLeadsReceived ?? 0,
      }
    : { connected: false, webhookUrl: googleAdsWebhookUrl };

  const metaAdsData: MetaAdsCardData = metaAdsIntegration
    ? {
        connected: true,
        appId: metaAdsIntegration.meta?.appId ?? null,
        hasOAuth: Boolean(metaAdsIntegration.oauth?.refreshToken),
        accountLabel: metaAdsIntegration.oauth?.accountEmail ?? null,
        pageId: metaAdsIntegration.meta?.pageId ?? null,
        pageName: metaAdsIntegration.meta?.pageName ?? null,
        // Strip the encrypted tokens — the client only needs id + name.
        pendingPages: (metaAdsIntegration.meta?.pendingPages ?? []).map(
          (p) => ({ id: p.id, name: p.name ?? "" }),
        ),
        status: metaAdsIntegration.status as "active" | "paused",
        tokenInvalid: metaAdsIntegration.meta?.tokenStatus === "invalid",
        lastEventAt: metaAdsIntegration.lastEventAt
          ? new Date(metaAdsIntegration.lastEventAt).toISOString()
          : null,
        totalLeadsReceived: metaAdsIntegration.totalLeadsReceived ?? 0,
        webhookUrl: metaAdsWebhookUrl,
        verifyToken: metaAdsIntegration.webhookKey,
      }
    : { connected: false };

  const webFormData: WebFormCardData = webFormIntegration
    ? {
        connected: true,
        webhookUrl: webFormWebhookUrl,
        webhookKey: webFormIntegration.webhookKey,
        status: webFormIntegration.status as "active" | "paused",
        lastEventAt: webFormIntegration.lastEventAt
          ? new Date(webFormIntegration.lastEventAt).toISOString()
          : null,
        totalLeadsReceived: webFormIntegration.totalLeadsReceived ?? 0,
      }
    : { connected: false, webhookUrl: webFormWebhookUrl };

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role: myRole,
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.14] dark:via-zinc-900 dark:to-secondary/[0.10]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start gap-3.5 p-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
              />
              <PlugZap className="relative h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Workspace Settings
              </p>
              <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Integrations
              </h1>
              <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                Connect external sources to{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {workspace.name}
                </span>
                . Leads from connected services land in your Leads section
                automatically.
              </p>
            </div>
          </div>
        </div>

        {googleAdResult === "connected" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            Google Ads account connected. Paste the webhook URL and key below
            into your Google Ads Lead Form to start receiving leads.
          </div>
        ) : googleAdResult === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            We couldn&apos;t finish connecting your Google account. Please try
            again.
          </div>
        ) : null}

        {metaAdResult === "connected" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            Meta Ads connected. New leads from your Facebook &amp; Instagram
            Lead Ads will appear in your Leads section automatically.
          </div>
        ) : metaAdResult === "select_page" ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[13px] text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
            Facebook account connected. Choose which Page should send its leads
            to this workspace below.
          </div>
        ) : metaAdResult === "no_pages" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            We couldn&apos;t find any Facebook Pages on that account. Sign in
            with an account that has admin access to your business Page.
          </div>
        ) : metaAdResult === "missing_credentials" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Save your Meta App ID and App Secret below before connecting with
            Facebook.
          </div>
        ) : metaAdResult === "page_in_use" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            That Facebook Page is already connected to another workspace.
            Disconnect it there first, then try again.
          </div>
        ) : metaAdResult === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            We couldn&apos;t finish connecting your Facebook account. Please try
            again.
          </div>
        ) : null}

        <GoogleAdsCard
          workspaceId={workspace.id}
          data={googleAdsData}
          defaultExpanded={googleAdResult === "connected"}
        />
        <MetaAdsCard
          workspaceId={workspace.id}
          data={metaAdsData}
          oauthRedirectUri={metaOauthRedirectUri}
          defaultExpanded={
            metaAdResult === "connected" || metaAdResult === "select_page"
          }
        />
        <WebFormCard workspaceId={workspace.id} data={webFormData} />
      </div>
    </DashboardLayout>
  );
}
