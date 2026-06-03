"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Check,
  Landmark,
  MapPin,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/button";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import Input from "@/components/input";
import PhoneInput from "@/components/phone-input";
import { cn } from "@/lib/cn";
import { COUNTRIES } from "@/lib/countries";
import { saveCompanyDetails, type CompanyActionState } from "../actions";

export type CompanyFormDefaults = {
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  website: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstin: string;
  pan: string;
  cin: string;
  taxId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

export const EMPTY_COMPANY_DEFAULTS: CompanyFormDefaults = {
  legalName: "",
  displayName: "",
  email: "",
  phone: "",
  website: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  gstin: "",
  pan: "",
  cin: "",
  taxId: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  branch: "",
  upiId: "",
};

const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

const countryOptions: ComboboxOption<string>[] = COUNTRIES.map((c) => ({
  value: c.name,
  label: c.name,
  keywords: [c.code],
}));

export default function CompanyDetailsForm({
  workspaceId,
  defaults,
}: {
  workspaceId: string;
  defaults: CompanyFormDefaults;
}) {
  const [values, setValues] = useState<CompanyFormDefaults>(defaults);
  const [state, setState] = useState<CompanyActionState>(undefined);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof CompanyFormDefaults>(
    k: K,
    v: CompanyFormDefaults[K],
  ) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [k]: v }));
  };

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveCompanyDetails(workspaceId, state, formData);
      if (result?.ok) {
        setState(undefined);
        setSaved(true);
      } else {
        setSaved(false);
        setState(result);
      }
    });
  };

  const errs = state?.errors;
  const errClass = (key: keyof NonNullable<typeof errs>) =>
    errs?.[key]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "";

  return (
    <form action={handleAction} className="space-y-5">
      {/* Identity */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          icon={Building2}
          title="Company identity"
          subtitle="The legal entity behind this workspace"
          accent="from-violet-500 to-purple-600"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="company-legalName" className={labelClass}>
              Legal name *
            </label>
            <Input
              id="company-legalName"
              name="legalName"
              value={values.legalName}
              onChange={(e) => set("legalName", e.target.value)}
              placeholder="Web Spider Solutions Pvt. Ltd."
              required
              autoComplete="off"
              className={cn("mt-2", errClass("legalName"))}
            />
            {errs?.legalName ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.legalName}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="company-displayName" className={labelClass}>
              Display / brand name
            </label>
            <Input
              id="company-displayName"
              name="displayName"
              value={values.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="Web Spider Solutions"
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-email" className={labelClass}>
              Email
            </label>
            <Input
              id="company-email"
              name="email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="hello@company.com"
              autoComplete="off"
              className={cn("mt-2", errClass("email"))}
            />
            {errs?.email ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.email}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="company-phone" className={labelClass}>
              Phone
            </label>
            <div className="mt-2">
              <PhoneInput
                id="company-phone"
                name="phone"
                defaultValue={values.phone}
                onChange={(v) => set("phone", v)}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="company-website" className={labelClass}>
              Website
            </label>
            <Input
              id="company-website"
              name="website"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://company.com"
              autoComplete="off"
              className="mt-2"
            />
          </div>
        </div>
      </section>

      {/* Registered address */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          icon={MapPin}
          title="Registered address"
          subtitle="Where the business is registered"
          accent="from-blue-500 to-indigo-600"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="company-line1" className={labelClass}>
              Address line 1
            </label>
            <Input
              id="company-line1"
              name="line1"
              value={values.line1}
              onChange={(e) => set("line1", e.target.value)}
              placeholder="Street, building, unit…"
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="company-line2" className={labelClass}>
              Address line 2
            </label>
            <Input
              id="company-line2"
              name="line2"
              value={values.line2}
              onChange={(e) => set("line2", e.target.value)}
              placeholder="Landmark, area, suite…"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-country" className={labelClass}>
              Country
            </label>
            <div className="mt-2">
              <Combobox
                id="company-country"
                value={values.country}
                onChange={(v) => set("country", v)}
                options={countryOptions}
                placeholder="Select country"
                searchPlaceholder="Search country…"
                emptyText="No country matches."
                allowClear
              />
            </div>
            <input type="hidden" name="country" value={values.country} />
          </div>
          <div>
            <label htmlFor="company-state" className={labelClass}>
              State
            </label>
            <Input
              id="company-state"
              name="state"
              value={values.state}
              onChange={(e) => set("state", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-city" className={labelClass}>
              City
            </label>
            <Input
              id="company-city"
              name="city"
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-postalCode" className={labelClass}>
              Postal code
            </label>
            <Input
              id="company-postalCode"
              name="postalCode"
              value={values.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
      </section>

      {/* Tax & registration */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          icon={Receipt}
          title="Tax & registration"
          subtitle="Identifiers printed on quotations and invoices"
          accent="from-amber-500 to-orange-600"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="company-gstin" className={labelClass}>
              GSTIN
            </label>
            <Input
              id="company-gstin"
              name="gstin"
              value={values.gstin}
              onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              placeholder="22ABCDE1234F1Z5"
              maxLength={15}
              className={cn("mt-2 uppercase", errClass("gstin"))}
            />
            {errs?.gstin ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.gstin}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="company-pan" className={labelClass}>
              PAN
            </label>
            <Input
              id="company-pan"
              name="pan"
              value={values.pan}
              onChange={(e) => set("pan", e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className={cn("mt-2 uppercase", errClass("pan"))}
            />
            {errs?.pan ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.pan}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="company-cin" className={labelClass}>
              CIN
            </label>
            <Input
              id="company-cin"
              name="cin"
              value={values.cin}
              onChange={(e) => set("cin", e.target.value.toUpperCase())}
              placeholder="U72900KA2015PTC000000"
              className="mt-2 uppercase"
            />
          </div>
          <div>
            <label htmlFor="company-taxId" className={labelClass}>
              Other tax ID
            </label>
            <Input
              id="company-taxId"
              name="taxId"
              value={values.taxId}
              onChange={(e) => set("taxId", e.target.value)}
              placeholder="VAT / TIN / EIN…"
              className="mt-2"
            />
          </div>
        </div>
      </section>

      {/* Bank details */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <SectionHeader
          icon={Landmark}
          title="Bank details"
          subtitle="Used for payment instructions on invoices"
          accent="from-emerald-500 to-teal-600"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="company-bankName" className={labelClass}>
              Bank name
            </label>
            <Input
              id="company-bankName"
              name="bankName"
              value={values.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              placeholder="HDFC Bank"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-accountName" className={labelClass}>
              Account holder name
            </label>
            <Input
              id="company-accountName"
              name="accountName"
              value={values.accountName}
              onChange={(e) => set("accountName", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-accountNumber" className={labelClass}>
              Account number
            </label>
            <Input
              id="company-accountNumber"
              name="accountNumber"
              value={values.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value)}
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-ifsc" className={labelClass}>
              IFSC / SWIFT
            </label>
            <Input
              id="company-ifsc"
              name="ifsc"
              value={values.ifsc}
              onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
              placeholder="HDFC0001234"
              className="mt-2 uppercase"
            />
          </div>
          <div>
            <label htmlFor="company-branch" className={labelClass}>
              Branch
            </label>
            <Input
              id="company-branch"
              name="branch"
              value={values.branch}
              onChange={(e) => set("branch", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="company-upiId" className={labelClass}>
              UPI ID
            </label>
            <Input
              id="company-upiId"
              name="upiId"
              value={values.upiId}
              onChange={(e) => set("upiId", e.target.value)}
              placeholder="company@okhdfcbank"
              className="mt-2"
            />
          </div>
        </div>
      </section>

      {state?.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:px-5 dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Company details saved.
            </span>
          ) : (
            "Changes apply across the workspace on save."
          )}
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br text-white shadow-sm",
          accent,
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
        />
        <Icon className="relative h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
