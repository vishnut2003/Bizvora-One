"use client";

import { ArrowRight, UserPlus, Users } from "lucide-react";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

type CustomerChooserPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickManual: () => void;
  onPickFromLead: () => void;
  fromLeadDisabled?: boolean;
  fromLeadDisabledReason?: string;
};

export default function CustomerChooserPopup({
  open,
  onOpenChange,
  onPickManual,
  onPickFromLead,
  fromLeadDisabled,
  fromLeadDisabledReason,
}: CustomerChooserPopupProps) {
  return (
    <Popup
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-lg"
    >
      <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
        />
        <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
            />
            <UserPlus className="relative h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Add a customer
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Start from scratch or promote a lead you&apos;re already
              working.
            </DialogDescription>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
        <ChoiceCard
          icon={<UserPlus className="h-5 w-5" />}
          title="Add manually"
          subtitle="Open a blank form and capture all the details."
          accent="from-blue-500 to-indigo-600"
          onClick={onPickManual}
        />
        <ChoiceCard
          icon={<Users className="h-5 w-5" />}
          title="Create from lead"
          subtitle={
            fromLeadDisabled
              ? fromLeadDisabledReason ??
                "No unconverted leads available."
              : "Pick an existing lead to prefill the customer form."
          }
          accent="from-emerald-500 to-teal-600"
          onClick={onPickFromLead}
          disabled={fromLeadDisabled}
        />
      </div>
    </Popup>
  );
}

function ChoiceCard({
  icon,
  title,
  subtitle,
  accent,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-start gap-2.5 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.18] ${accent}`}
      />
      <span
        className={`relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-gradient-to-br text-white shadow-sm ${accent}`}
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
        />
        <span className="relative">{icon}</span>
      </span>
      <p className="relative text-[14px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </p>
      <p className="relative text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        {subtitle}
      </p>
      <span className="relative mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Continue <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  );
}
