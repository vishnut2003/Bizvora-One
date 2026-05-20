import type { ComponentType, SVGProps } from "react";
import {
  ClipboardCheck,
  ClipboardList,
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
import type { UserRole } from "@/lib/user";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
};

export type NavSection = {
  heading: string;
  items: NavItem[];
  restrictedTo?: UserRole[];
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
      { href: "/proposals", label: "AI Proposals", icon: FileText },
      { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
    ],
    restrictedTo: ["owner", "admin", "sales_manager", "sales_executive"],
  },
  {
    heading: "Accounts",
    items: [
      { href: "/sales-orders", label: "Sales Order", icon: ClipboardList },
      { href: "/sale-invoices", label: "Sale Invoice", icon: ReceiptText },
      { href: "/receipts", label: "Receipts", icon: Receipt },
      { href: "/recovery", label: "Recovery", icon: RotateCcw },
      {
        href: "/purchase-orders",
        label: "Purchase Order",
        icon: ClipboardCheck,
      },
      {
        href: "/purchase-invoices",
        label: "Purchase Invoice",
        icon: ShoppingCart,
      },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
    restrictedTo: ["owner", "admin", "sales_manager", "accounts"],
  },
  {
    heading: "HR & Payroll",
    items: [{ href: "/employees", label: "Employees", icon: IdCard }],
    restrictedTo: ["owner", "admin", "hr"],
  },
];
