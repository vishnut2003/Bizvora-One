import type { ComponentType, SVGProps } from "react";
import { UserIcon } from "lucide-react";

export type AccountNavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const accountNav: AccountNavItem[] = [
  { href: "/my-account/profile", label: "Profile", icon: UserIcon },
];
