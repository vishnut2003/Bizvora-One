"use client";

import { useMemo, useState } from "react";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import Input from "@/components/input";
import { PHONE_COUNTRIES, combinePhone, splitPhone } from "@/lib/phone";

type Props = {
  // Hidden field name that carries the combined value (e.g. "+919876543210").
  name?: string;
  // Existing stored value to seed from (edit mode). Parsed once on mount.
  defaultValue?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  // Optional: lets controlled parents keep their own state in sync.
  onChange?: (combined: string) => void;
};

const COUNTRY_OPTIONS: ComboboxOption[] = PHONE_COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.name} (+${c.dial})`,
  keywords: [c.name, c.code, c.dial, `+${c.dial}`],
  renderTrigger: (
    <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
      +{c.dial}
    </span>
  ),
  renderItem: (
    <span className="flex w-full items-center gap-2">
      <span className="min-w-0 flex-1 truncate">{c.name}</span>
      <span className="shrink-0 tabular-nums text-zinc-400 dark:text-zinc-500">
        +{c.dial}
      </span>
    </span>
  ),
}));

export default function PhoneInput({
  name = "phone",
  defaultValue,
  id,
  invalid,
  disabled,
  autoFocus,
  placeholder = "98765 43210",
  onChange,
}: Props) {
  const seed = useMemo(() => splitPhone(defaultValue), [defaultValue]);
  const [code, setCode] = useState(seed.code);
  const [national, setNational] = useState(seed.national);

  const combined = combinePhone(code, national);

  const update = (nextCode: string, nextNational: string) => {
    setCode(nextCode);
    setNational(nextNational);
    onChange?.(combinePhone(nextCode, nextNational));
  };

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={combined} readOnly />
      <div className="w-[116px] shrink-0">
        <Combobox
          value={code}
          onChange={(v) => update(v || code, national)}
          options={COUNTRY_OPTIONS}
          searchPlaceholder="Country or code…"
          emptyText="No countries."
          disabled={disabled}
          invalid={invalid}
          contentClassName="w-[280px]"
        />
      </div>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        value={national}
        onChange={(e) => update(code, e.target.value.replace(/[^\d\s-]/g, ""))}
        placeholder={placeholder}
        className="flex-1"
        // Visual aid only — the dial code is stored via the hidden input.
        aria-label="National phone number"
      />
    </div>
  );
}
