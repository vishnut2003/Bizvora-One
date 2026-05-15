import type { HTMLInputTypeAttribute } from "react";
import Input from "./input";
import { cn } from "@/lib/cn";

type FieldProps = {
  id: string;
  name?: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
};

export default function Field({
  id,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  hint,
  required,
  defaultValue,
  error,
}: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

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
        name={name ?? id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "mt-1.5",
          error &&
            "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
        )}
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-[11px] text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
