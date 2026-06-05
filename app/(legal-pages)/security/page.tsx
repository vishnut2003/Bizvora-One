import type { Metadata } from "next";
import BasicLayout from "@/layouts/basic-layout";
import LegalPagesLayout from "@/layouts/legal-pages-layout";
import { LAST_UPDATED } from "@/content/legal/_shared";
import { securityContent } from "@/content/legal/security";

export const metadata: Metadata = {
  title: "Security — BizvoraOne",
  description:
    "The technical and organisational measures BizvoraOne uses to protect your data.",
};

export default function SecurityPage() {
  return (
    <BasicLayout>
      <LegalPagesLayout
        title="Security"
        updated={LAST_UPDATED}
        summary="How we protect the platform and your data."
        content={securityContent}
      />
    </BasicLayout>
  );
}
