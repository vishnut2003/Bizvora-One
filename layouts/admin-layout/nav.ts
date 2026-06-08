import type { ComponentType, SVGProps } from "react";
import {
  Building2Icon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";

export type NavItem = {
  // Absolute path. Active when pathname matches exactly or is a descendant —
  // set `exact` to only highlight on the exact pathname (used for overview
  // routes that share a prefix with sub-pages).
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: string;
  exact?: boolean;
};

export type NavSection = {
  heading: string;
  items: NavItem[];
};

// Single-section nav for now. New admin sub-pages get added here.
export const navSections: NavSection[] = [
  {
    heading: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboardIcon,
        exact: true,
      },
    ]
  },
  {
    heading: "Management",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        icon: UsersIcon,
      },
      {
        href: "/admin/workspaces",
        label: "Workspaces",
        icon: Building2Icon,
      },
      {
        href: "/admin/feedback",
        label: "Feedback",
        icon: MessageSquareIcon,
      },
    ],
  },
];
