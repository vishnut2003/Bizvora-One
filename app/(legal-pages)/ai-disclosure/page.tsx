import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { aiDisclosureContent } from "@/content/legal/ai-disclosure";

export const metadata: Metadata = {
  title: "AI & Automated-Calling Disclosure — BizvoraOne",
  description:
    "How BizvoraOne's AI proposal drafting and automated voice-calling features work, and your responsibilities.",
};

export default function AiDisclosurePage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="AI & Automated-Calling Disclosure"
        updated={LAST_UPDATED}
        summary="How our AI features work and what they require of you."
        content={aiDisclosureContent}
      />
    </BasicLayout>
  );
}
