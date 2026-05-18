"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

type DatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  minDate?: Date;
};

export default function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled,
  className,
  invalid,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 transition-colors hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-700",
            !value && "text-zinc-400 dark:text-zinc-500",
            invalid &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            {value ? format(value, "PPP") : placeholder}
          </span>
          {value ? (
            <span
              role="button"
              aria-label="Clear date"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
              className="grid h-5 w-5 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-3 w-3" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => {
            onChange(d ?? null);
            if (d) setOpen(false);
          }}
          disabled={minDate ? { before: minDate } : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
