import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EyebrowProps = {
  children: ReactNode;
  className?: string;
};

export default function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.18em] text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
