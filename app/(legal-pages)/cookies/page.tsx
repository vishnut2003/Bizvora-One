import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { cookiesContent } from "@/content/legal/cookies";

export const metadata: Metadata = {
  title: "Cookie Policy — BizvoraOne",
  description: "How BizvoraOne uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Cookie Policy"
        updated={LAST_UPDATED}
        summary="How we use cookies and similar technologies."
        content={cookiesContent}
      />
    </BasicLayout>
  );
}
