import type { HTMLInputTypeAttribute } from "react";
import Input from "./input";

type FieldProps = {
  id: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
};

export default function Field({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  hint,
  required,
  defaultValue,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        className="mt-1.5"
      />
      {hint ? (
        <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
