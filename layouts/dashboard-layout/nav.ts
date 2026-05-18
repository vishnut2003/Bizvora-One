import type { ComponentType, SVGProps } from "react";
import {
  CreditCard,
  FileSpreadsheet,
  FileText,
  IdCard,
  LayoutDashboardIcon,
  Receipt,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
};

export type NavSection = {
  heading: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    heading: "Workspace",
    items: [{ href: "/", label: "Overview", icon: LayoutDashboardIcon }],
  },
  {
    heading: "Sales",
    items: [
      { href: "/leads", label: "Leads & Prospects", icon: UserPlus },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/proposals", label: "Proposals", icon: FileText },
    ],
  },
  {
    heading: "Accounts",
    items: [
      { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
      { href: "/sale-invoices", label: "Sale Invoice", icon: ReceiptText },
      { href: "/receipts", label: "Receipts", icon: Receipt },
      { href: "/recovery", label: "Recovery", icon: RotateCcw },
      {
        href: "/purchase-invoices",
        label: "Purchase Invoice",
        icon: ShoppingCart,
      },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    heading: "Human Resource",
    items: [{ href: "/payment-slips", label: "Payment Slip", icon: Wallet }],
  },
  {
    heading: "For HR",
    items: [{ href: "/employees", label: "Employees", icon: IdCard }],
  },
];
