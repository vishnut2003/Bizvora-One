import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaultProps: IconProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 12 12" {...defaultProps} {...props}>
      <path d="M2 6.5l2.5 2.5L10 3.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
      <path d="M10 11l3-3-3-3M13 8H6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}
