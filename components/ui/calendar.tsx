"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/cn";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      {...props}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-3",
        month: "flex flex-col gap-3",
        month_caption:
          "flex items-center justify-center pt-1 text-[13px] font-medium text-zinc-900 dark:text-zinc-100",
        caption_label: "text-[13px] font-semibold",
        nav: "flex items-center justify-between px-1 absolute inset-x-0 top-3 z-10",
        button_previous: cn(
          "grid h-7 w-7 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
        ),
        button_next: cn(
          "grid h-7 w-7 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[10.5px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500",
        week: "flex w-full mt-1",
        day: "h-9 w-9 p-0 text-center text-[12.5px] relative",
        day_button:
          "h-9 w-9 rounded-md text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-zinc-200 dark:hover:bg-zinc-800",
        today:
          "[&_button]:font-semibold [&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-primary/30",
        selected:
          "[&_button]:bg-gradient-to-br [&_button]:from-primary [&_button]:to-secondary [&_button]:text-white [&_button]:shadow-sm [&_button]:shadow-primary/30 [&_button]:hover:from-primary [&_button]:hover:to-secondary",
        outside: "[&_button]:text-zinc-300 dark:[&_button]:text-zinc-600",
        disabled:
          "[&_button]:text-zinc-300 [&_button]:cursor-not-allowed dark:[&_button]:text-zinc-700",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return (
            <Icon className={cn("h-3.5 w-3.5", chevronClassName)} aria-hidden />
          );
        },
      }}
    />
  );
}

export { Calendar };
