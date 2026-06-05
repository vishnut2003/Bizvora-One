import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { acceptableUseContent } from "@/content/legal/acceptable-use";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — BizvoraOne",
  description:
    "Activities that are prohibited when using BizvoraOne, including its messaging and AI calling features.",
};

export default function AcceptableUsePage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Acceptable Use Policy"
        updated={LAST_UPDATED}
        summary="What you may and may not do when using the platform."
        content={acceptableUseContent}
      />
    </BasicLayout>
  );
}
