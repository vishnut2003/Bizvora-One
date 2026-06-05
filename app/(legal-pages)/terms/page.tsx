import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { termsContent } from "@/content/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service — BizvoraOne",
  description:
    "The terms that govern your access to and use of the BizvoraOne platform.",
};

export default function TermsPage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Terms of Service"
        updated={LAST_UPDATED}
        summary="The agreement that governs your use of BizvoraOne."
        content={termsContent}
      />
    </BasicLayout>
  );
}
