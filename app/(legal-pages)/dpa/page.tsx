import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { dpaContent } from "@/content/legal/dpa";

export const metadata: Metadata = {
  title: "Data Processing Agreement — BizvoraOne",
  description:
    "How BizvoraOne processes personal data on behalf of its customers, in support of GDPR and DPDP Act compliance.",
};

export default function DpaPage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Data Processing Agreement"
        updated={LAST_UPDATED}
        summary="How we process personal data on your behalf as your processor."
        content={dpaContent}
      />
    </BasicLayout>
  );
}
