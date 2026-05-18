"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

export type ComboboxOption<T extends string = string> = {
  value: T;
  label: string;
  keywords?: string[];
  renderItem?: React.ReactNode;
  renderTrigger?: React.ReactNode;
};

type ComboboxProps<T extends string> = {
  value: T | "";
  onChange: (value: T | "") => void;
  options: ComboboxOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  allowClear?: boolean;
  contentClassName?: string;
};

export default function Combobox<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  id,
  disabled,
  invalid,
  className,
  allowClear = false,
  contentClassName,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid ? true : undefined}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-left text-sm transition-colors hover:border-zinc-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
            selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500",
            invalid &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
            {selected ? selected.renderTrigger ?? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear ? (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange("" as T | "");
                    setOpen(false);
                  }}
                  className="text-zinc-500 dark:text-zinc-400"
                >
                  <span className="flex-1">Clear selection</span>
                </CommandItem>
              ) : null}
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${(option.keywords ?? []).join(" ")} ${option.value}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="flex flex-1 items-center gap-2 truncate">
                      {option.renderItem ?? option.label}
                    </span>
                    <Check
                      className={cn(
                        "ml-2 h-3.5 w-3.5",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
