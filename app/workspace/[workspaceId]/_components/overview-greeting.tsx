"use client";

import { useSyncExternalStore } from "react";

function greetingForHour(h: number): string {
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function dateLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
}

type Props = {
  firstName: string;
  /** Server-rendered fallbacks (IST). Shown until the browser's local
   *  time is known, so there's no layout shift or hydration mismatch. */
  initialGreeting: string;
  initialDateLabel: string;
};

const emptySubscribe = () => () => {};

export default function OverviewGreeting({
  firstName,
  initialGreeting,
  initialDateLabel,
}: Props) {
  // false during SSR and the first (hydration) render, true after the client
  // commits — then new Date() reflects the visitor's own timezone, so greeting
  // and date match their local wall clock without a hydration mismatch.
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const now = isClient ? new Date() : null;
  const greeting = now ? greetingForHour(now.getHours()) : initialGreeting;
  const today = now ? dateLabel(now) : initialDateLabel;

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
        Overview · {today}
      </p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
        {greeting}, {firstName}
      </h1>
    </>
  );
}
