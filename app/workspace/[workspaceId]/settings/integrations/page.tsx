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
import WebFormCard, {
  type WebFormCardData,
} from "./_components/web-form-card";

export const metadata: Metadata = {
  title: "Integrations — WSS CRM",
};

type IntegrationsPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function IntegrationsPage({
  params,
  searchParams,
}: IntegrationsPageProps) {
  const { workspaceId } = await params;
  const { status } = await searchParams;

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: INTEGRATION_MANAGER_ROLES,
  });

  await connectDB();
  const [googleAdsIntegration, webFormIntegration] = await Promise.all([
    Integration.findOne({
      workspace: workspaceId,
      provider: "google_ads",
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

        {status === "connected" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            Google Ads account connected. Paste the webhook URL and key below
            into your Google Ads Lead Form to start receiving leads.
          </div>
        ) : status === "oauth_error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            We couldn&apos;t finish connecting your Google account. Please try
            again.
          </div>
        ) : null}

        <GoogleAdsCard workspaceId={workspace.id} data={googleAdsData} />
        <WebFormCard workspaceId={workspace.id} data={webFormData} />
      </div>
    </DashboardLayout>
  );
}
