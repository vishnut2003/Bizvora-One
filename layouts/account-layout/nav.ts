import type { ComponentType, SVGProps } from "react";
import {
  CreditCardIcon,
  ReceiptIcon,
  UserIcon,
} from "lucide-react";

export type AccountNavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const accountNav: AccountNavItem[] = [
  { href: "/my-account/profile", label: "Profile", icon: UserIcon },
  {
    href: "/my-account/subscriptions",
    label: "Subscriptions",
    icon: CreditCardIcon,
  },
  { href: "/my-account/invoices", label: "Invoices", icon: ReceiptIcon },
];
