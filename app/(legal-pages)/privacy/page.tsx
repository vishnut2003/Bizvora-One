import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { privacyContent } from "@/content/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — BizvoraOne",
  description:
    "How BizvoraOne collects, uses, shares, and protects personal data, in line with India's DPDP Act, GDPR, and CCPA.",
};

export default function PrivacyPage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Privacy Policy"
        updated={LAST_UPDATED}
        summary="How we collect, use, share, and protect personal data."
        content={privacyContent}
      />
    </BasicLayout>
  );
}
