"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import {
  QuotationPdfDocument,
  type QuotationPdfCompany,
  type QuotationPdfData,
} from "./quotation-pdf-document";

type Props = {
  company: QuotationPdfCompany;
  quotation: QuotationPdfData;
};

export default function QuotationPdfViewer({ company, quotation }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    (async () => {
      try {
        const blob = await pdf(
          <QuotationPdfDocument company={company} quotation={quotation} />,
        ).toBlob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
        setError(null);
      } catch (err) {
        console.error("[QuotationPdfViewer] render failed", err);
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't render the quotation PDF.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [company, quotation]);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-15rem)] min-h-[420px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
        <p className="max-w-sm text-[12.5px] text-rose-700 dark:text-rose-300">
          {error}
        </p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-[calc(100vh-15rem)] min-h-[420px] items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-[12.5px] text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Rendering quotation PDF…
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
        <span className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
          Preview of {quotation.number}
        </span>
        <a
          href={url}
          download={`${quotation.number.replace(/[^\w-]+/g, "_")}.pdf`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-secondary px-3 text-[12px] font-medium text-white shadow-sm shadow-primary/25 transition-shadow hover:shadow-md hover:shadow-primary/35"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
      <iframe
        title={`Quotation ${quotation.number} preview`}
        src={url}
        className="h-[calc(100vh-15rem)] min-h-[420px] w-full border-0 bg-zinc-100 dark:bg-zinc-950"
      />
    </div>
  );
}
