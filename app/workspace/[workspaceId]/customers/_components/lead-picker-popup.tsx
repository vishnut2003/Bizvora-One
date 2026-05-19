"use client";

import { ArrowLeft, Building2, Mail, Phone, Users } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type ConvertibleLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  source: string;
  assignedTo: string;
  tags: string[];
  city: string;
  state: string;
  country: string;
};

type LeadPickerPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: ConvertibleLead[];
  onPick: (lead: ConvertibleLead) => void;
  onBack: () => void;
};

export default function LeadPickerPopup({
  open,
  onOpenChange,
  leads,
  onPick,
  onBack,
}: LeadPickerPopupProps) {
  return (
    <Popup
      open={open}
      onOpenChange={onOpenChange}
      className="max-h-[88vh] overflow-hidden sm:max-w-xl"
    >
      <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
        />
        <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
            />
            <Users className="relative h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Pick a lead to convert
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Only leads that haven&apos;t been converted yet are shown.
            </DialogDescription>
          </div>
        </div>
      </div>

      <div className="px-2 pt-2">
        <Command shouldFilter className="max-h-[60vh]">
          <CommandInput
            placeholder="Search by name, company or email…"
            autoFocus
          />
          <CommandList className="max-h-[52vh]">
            <CommandEmpty>No leads match your search.</CommandEmpty>
            {leads.map((lead) => (
              <CommandItem
                key={lead.id}
                value={`${lead.name} ${lead.email} ${lead.company} ${lead.phone}`}
                onSelect={() => onPick(lead)}
                className="flex items-start gap-3 px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-[12.5px] font-semibold text-white shadow-sm shadow-primary/20">
                  {lead.name.charAt(0).toUpperCase() || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                      {lead.name}
                    </span>
                    {lead.company ? (
                      <span className="inline-flex items-center gap-1 truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                        <Building2 className="h-3 w-3" />
                        {lead.company}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                    {lead.email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                    ) : null}
                    {lead.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    ) : null}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
          {leads.length} {leads.length === 1 ? "lead" : "leads"} available
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Popup>
  );
}
