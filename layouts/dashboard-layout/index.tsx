import type { ReactNode } from "react";
import type { WorkspaceColor } from "@/lib/workspace";
import type { UserRole } from "@/lib/user";
import Header from "./header";
import Sidebar from "./sidebar";

type DashboardLayoutProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  workspace: {
    id: string;
    name: string;
    color: WorkspaceColor;
    role: UserRole;
  };
  children: ReactNode;
};

export default function DashboardLayout({
  user,
  workspace,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header user={user} workspace={workspace} />
      <div className="flex flex-1">
        <Sidebar workspaceId={workspace.id} role={workspace.role} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
