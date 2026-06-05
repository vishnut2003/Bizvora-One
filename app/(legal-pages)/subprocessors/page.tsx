import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { subprocessorsContent } from "@/content/legal/subprocessors";

export const metadata: Metadata = {
  title: "Sub-processors — BizvoraOne",
  description:
    "The third-party sub-processors that may process personal data on behalf of BizvoraOne.",
};

export default function SubprocessorsPage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Sub-processors"
        updated={LAST_UPDATED}
        summary="The trusted third parties that help us deliver the service."
        content={subprocessorsContent}
      />
    </BasicLayout>
  );
}
