import type { ComponentType, SVGProps } from "react";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Flag,
  FolderKanban,
  FolderOpen,
  IdCard,
  LayoutDashboardIcon,
  ListTodo,
  PlugZap,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/user";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
  // When true the item is only highlighted on an exact pathname match, not for
  // descendant routes. Used for "overview"-style links that share a prefix with
  // their siblings (e.g. a project root vs. its sub-pages).
  exact?: boolean;
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
    heading: "Customers",
    items: [{ href: "/customers", label: "Customers", icon: Users }],
    restrictedTo: [
      "owner",
      "admin",
      "sales_manager",
      "sales_executive",
      "accounts",
      "project_manager",
      "team_member",
    ],
  },
  {
    heading: "Sales",
    items: [
      { href: "/leads", label: "Leads & Prospects", icon: UserPlus },
      { href: "/proposals", label: "AI Proposals", icon: FileText },
      { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
    ],
    restrictedTo: ["owner", "admin", "sales_manager", "sales_executive"],
  },
  {
    heading: "Project Management",
    items: [{ href: "/projects", label: "Projects", icon: FolderKanban }],
    restrictedTo: ["owner", "admin", "project_manager", "team_member"],
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
      { href: "/vendors", label: "Vendors", icon: Truck },
    ],
    restrictedTo: ["owner", "admin", "sales_manager", "accounts"],
  },
  {
    heading: "HR & Payroll",
    items: [{ href: "/users", label: "Users", icon: IdCard }],
    restrictedTo: ["owner", "admin", "hr"],
  },
  {
    heading: "Workspace Settings",
    items: [
      { href: "/company-details", label: "Company Details", icon: Building2 },
      {
        href: "/settings/integrations",
        label: "Integrations",
        icon: PlugZap,
      },
    ],
    restrictedTo: ["owner", "admin"],
  },
];

// Serializable description of which sidebar menu to show. Server Components
// pass this (a plain object) across the client boundary — the icon-bearing
// NavSection[] is built on the client via `resolveNavSections`, since React
// components can't be passed as props from a Server Component.
export type NavConfig =
  | { type: "workspace" }
  | { type: "project"; projectId: string };

export function resolveNavSections(nav?: NavConfig): NavSection[] {
  if (nav?.type === "project") return projectNavSections(nav.projectId);
  return navSections;
}

// Sidebar menu shown while viewing a single project. Item hrefs are relative
// to the workspace base (NavList prepends `/workspace/{id}`), so each one
// points at `/projects/{projectId}/...`.
export function projectNavSections(projectId: string): NavSection[] {
  const base = `/projects/${projectId}`;
  return [
    {
      heading: "Project",
      items: [
        { href: base, label: "Overview", icon: LayoutDashboardIcon, exact: true },
        { href: `${base}/tasks`, label: "Tasks", icon: ListTodo },
        { href: `${base}/milestones`, label: "Milestones", icon: Flag },
        { href: `${base}/files`, label: "Files", icon: FolderOpen },
        { href: `${base}/team`, label: "Team", icon: Users },
        { href: `${base}/settings`, label: "Settings", icon: Settings },
      ],
    },
    {
      heading: "Workspace",
      items: [
        {
          href: "/projects",
          label: "Back to Projects",
          icon: FolderKanban,
          // Without this it'd match every /projects/* descendant (i.e. the
          // project pages it lives on) and stay perpetually highlighted.
          exact: true,
        },
      ],
    },
  ];
}
