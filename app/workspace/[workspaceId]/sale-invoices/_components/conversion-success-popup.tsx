"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";

type Props = {
  sourceOrderNumber: string;
  invoiceNumber: string;
};

// One-time success modal shown after a sales order has been converted into
// an invoice. Drops the `?fromOrder=…` query param on dismiss so a reload
// doesn't re-open it.
export default function ConversionSuccessPopup({
  sourceOrderNumber,
  invoiceNumber,
}: Props) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  function dismiss() {
    setOpen(false);
    // Strip the query string so a refresh doesn't fire the popup again.
    router.replace(pathname);
  }

  return (
    <Popup
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      className="sm:max-w-md"
      title={
        <span className="inline-flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          Invoice raised successfully
        </span>
      }
      description="The sales order has been converted into a new invoice. Set the due date and payment terms before sending it to the customer."
    >
      <div className="space-y-4 px-6 pb-6 pt-2">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Sales order
              </p>
              <p className="mt-0.5 truncate font-mono text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
                {sourceOrderNumber}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Invoice
              </p>
              <p className="mt-0.5 truncate font-mono text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                {invoiceNumber}
              </p>
            </div>
          </div>
        </div>
        <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
          The source order&apos;s status has been updated to{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            Invoiced
          </span>
          .
        </p>
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={dismiss}
          >
            Continue editing
          </Button>
        </div>
      </div>
    </Popup>
  );
}
