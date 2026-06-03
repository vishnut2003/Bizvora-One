"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  IdCard,
  MapPin,
  Truck,
  UserSquare,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import PhoneInput from "@/components/phone-input";
import { cn } from "@/lib/cn";
import {
  VENDOR_STATUSES,
  VENDOR_STATUS_LABEL,
  type VendorStatus,
} from "@/lib/vendor";
import {
  createVendor,
  updateVendor,
  type VendorActionState,
} from "../actions";

export type VendorFormDefaults = {
  name: string;
  displayName: string;
  email: string;
  phone: string;
  contactPerson: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstin: string;
  pan: string;
  status: VendorStatus;
  notes: string;
};

export const EMPTY_VENDOR_DEFAULTS: VendorFormDefaults = {
  name: "",
  displayName: "",
  email: "",
  phone: "",
  contactPerson: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  gstin: "",
  pan: "",
  status: "active",
  notes: "",
};

type Props = {
  mode: "create" | "edit";
  workspaceId: string;
  vendorId?: string;
  defaults: VendorFormDefaults;
};

const INITIAL_STATE: VendorActionState = {};
const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

export default function VendorForm({
  mode,
  workspaceId,
  vendorId,
  defaults,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<VendorStatus>(defaults.status);

  const [state, formAction, pending] = useActionState(
    (prev: VendorActionState, formData: FormData) =>
      mode === "create"
        ? createVendor(workspaceId, prev, formData)
        : updateVendor(workspaceId, vendorId!, prev, formData),
    INITIAL_STATE,
  );

  const errs = state.errors;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="status" value={status} readOnly />

      <Section
        icon={Truck}
        title="Vendor"
        subtitle="Supplier or service provider you buy from"
        accent="from-blue-500 to-indigo-600"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>
              Name *
            </label>
            <Input
              id="name"
              name="name"
              required
              autoFocus={mode === "create"}
              maxLength={160}
              defaultValue={defaults.name}
              placeholder="Legal name (e.g. Acme Suppliers Pvt Ltd)"
              className="mt-2"
            />
            {errs?.name ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.name}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="displayName" className={labelClass}>
              Display name
            </label>
            <Input
              id="displayName"
              name="displayName"
              maxLength={160}
              defaultValue={defaults.displayName}
              placeholder="Short name used in lists (e.g. Acme)"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults.email}
              placeholder="ap@acme.com"
              className="mt-2"
            />
            {errs?.email ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.email}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <div className="mt-2">
              <PhoneInput
                id="phone"
                name="phone"
                defaultValue={defaults.phone}
                invalid={Boolean(errs?.phone)}
              />
            </div>
            {errs?.phone ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.phone}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="contactPerson" className={labelClass}>
              Contact person
            </label>
            <Input
              id="contactPerson"
              name="contactPerson"
              defaultValue={defaults.contactPerson}
              placeholder="Sales or AR contact name"
              className="mt-2"
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VendorStatus)}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {VENDOR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VENDOR_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section
        icon={IdCard}
        title="Tax identifiers"
        subtitle="GSTIN and PAN for purchase invoice reporting"
        accent="from-violet-500 to-purple-600"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="gstin" className={labelClass}>
              GSTIN
            </label>
            <Input
              id="gstin"
              name="gstin"
              defaultValue={defaults.gstin}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="mt-2 font-mono uppercase tracking-tight"
            />
            {errs?.gstin ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.gstin}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="pan" className={labelClass}>
              PAN
            </label>
            <Input
              id="pan"
              name="pan"
              defaultValue={defaults.pan}
              placeholder="AAAAA0000A"
              maxLength={10}
              className="mt-2 font-mono uppercase tracking-tight"
            />
            {errs?.pan ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {errs.pan}
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        icon={MapPin}
        title="Address"
        subtitle="Used on purchase invoices and statutory reports"
        accent="from-emerald-500 to-teal-600"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="line1" className={labelClass}>
              Address line 1
            </label>
            <Input
              id="line1"
              name="line1"
              defaultValue={defaults.line1}
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="line2" className={labelClass}>
              Address line 2
            </label>
            <Input
              id="line2"
              name="line2"
              defaultValue={defaults.line2}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>
              City
            </label>
            <Input
              id="city"
              name="city"
              defaultValue={defaults.city}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="state" className={labelClass}>
              State
            </label>
            <Input
              id="state"
              name="state"
              defaultValue={defaults.state}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="country" className={labelClass}>
              Country
            </label>
            <Input
              id="country"
              name="country"
              defaultValue={defaults.country}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="postalCode" className={labelClass}>
              Postal code
            </label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={defaults.postalCode}
              className="mt-2"
            />
          </div>
        </div>
      </Section>

      <Section
        icon={FileText}
        title="Notes"
        subtitle="Internal context that travels with this vendor"
        accent="from-amber-500 to-orange-600"
      >
        <textarea
          name="notes"
          defaultValue={defaults.notes}
          rows={4}
          maxLength={4000}
          placeholder="Payment terms, banking info, account manager, etc."
          className={cn(
            "w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
          )}
        />
      </Section>

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_18px_38px_-18px_rgba(24,24,27,0.22)] dark:border-zinc-800 dark:bg-zinc-900">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
          <UserSquare className="h-3.5 w-3.5" />
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create vendor"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  accent,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
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
      {children}
    </section>
  );
}
