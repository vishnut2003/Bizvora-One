import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import DocsLayout from "@/layouts/docs-layout";
import { howToConnectMetaAdsContent } from "@/content/docs/how-to-connect-meta-ads";

export const metadata: Metadata = {
  title: "How to Connect Meta Ads with BizvoraOne — Docs",
  description:
    "Step-by-step guide to connecting Facebook & Instagram Lead Ads with BizvoraOne so new leads land in your CRM automatically — create a Meta app, configure the webhook, and connect your Page.",
};

export default function HowToConnectMetaAdsPage() {
  return (
    <BasicLayout>
      <DocsLayout
        title="How to connect Meta Ads with BizvoraOne"
        description="Bring leads from your Facebook & Instagram Lead Ads straight into your CRM — set up once, and every form submission becomes a lead within seconds."
        updated="2026-07-02"
        breadcrumbs={[
          { label: "Docs" },
          { label: "Integrations" },
          { label: "Meta Ads" },
        ]}
        content={howToConnectMetaAdsContent}
      />
    </BasicLayout>
  );
}
