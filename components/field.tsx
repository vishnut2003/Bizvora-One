"use client";

import { useState, type HTMLInputTypeAttribute } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          name={name ?? id}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            isPassword && "pr-10",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
          )}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:text-zinc-700 focus-visible:outline-none dark:text-zinc-500 dark:hover:text-zinc-200 dark:focus-visible:text-zinc-200"
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
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
