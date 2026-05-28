import type { Metadata } from "next";
import {
  Banknote,
  Briefcase,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  FolderKanban,
  IdCard,
  LayoutDashboard,
  Receipt as ReceiptIcon,
  Sparkles,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { ROLE_BADGE_CLASS, ROLE_LABEL, type UserRole } from "@/lib/user";
import { cn } from "@/lib/cn";
import DashboardLayout from "@/layouts/dashboard-layout";
import ExecutiveOverview from "./_components/executive-overview";
import SalesOverview from "./_components/sales-overview";
import AccountsOverview from "./_components/accounts-overview";
import ProjectsOverview from "./_components/projects-overview";
import HrOverview from "./_components/hr-overview";
import { QuickAction } from "./_components/overview-widgets";

export const metadata: Metadata = {
  title: "Workspace — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceOverviewPage({ params }: Props) {
  const { workspaceId } = await params;

  const { session, workspace: doc, role } = await requireWorkspaceAccess({
    workspaceId,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const greeting = greetingFor(new Date());
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-white to-secondary/[0.06] dark:from-primary/[0.18] dark:via-zinc-900 dark:to-secondary/[0.14]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 opacity-50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/15 opacity-40 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <LayoutDashboard className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Overview · {todayLabel}
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  {greeting}, {firstName}
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  Here&apos;s what&apos;s moving in{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
                  ROLE_BADGE_CLASS[role],
                )}
              >
                <Sparkles className="h-3 w-3" />
                {ROLE_LABEL[role]} view
              </span>
            </div>
          </div>

          {/* Quick actions strip */}
          <QuickActions workspaceId={workspace.id} role={role} />
        </div>

        {/* Role-specific body */}
        <RoleBody workspaceId={workspace.id} role={role} userId={session.user.id} />
      </div>
    </DashboardLayout>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function RoleBody({
  workspaceId,
  role,
  userId,
}: {
  workspaceId: string;
  role: UserRole;
  userId: string;
}) {
  if (role === "owner" || role === "admin") {
    return <ExecutiveOverview workspaceId={workspaceId} />;
  }
  if (role === "sales_manager") {
    return (
      <SalesOverview workspaceId={workspaceId} userId={userId} mineOnly={false} />
    );
  }
  if (role === "sales_executive") {
    return (
      <SalesOverview workspaceId={workspaceId} userId={userId} mineOnly={true} />
    );
  }
  if (role === "accounts") {
    return <AccountsOverview workspaceId={workspaceId} />;
  }
  if (role === "project_manager") {
    return (
      <ProjectsOverview
        workspaceId={workspaceId}
        userId={userId}
        mineOnly={false}
      />
    );
  }
  if (role === "team_member") {
    return (
      <ProjectsOverview
        workspaceId={workspaceId}
        userId={userId}
        mineOnly={true}
      />
    );
  }
  if (role === "hr") {
    return <HrOverview workspaceId={workspaceId} />;
  }
  // Defensive fallback — shouldn't happen because UserRole is exhaustive,
  // but typed roles can shift over time.
  return null;
}

function QuickActions({
  workspaceId,
  role,
}: {
  workspaceId: string;
  role: UserRole;
}) {
  const base = `/workspace/${workspaceId}`;

  // Per-role quick actions. Hard-walled to what the user can actually do —
  // mirrors the role gates in lib/{lead, customer, voucher}.ts and nav.ts.
  const actions: Array<{ href: string; label: string; icon: typeof Users }> = [];

  if (role === "owner" || role === "admin") {
    actions.push(
      { href: `${base}/leads`, label: "New lead", icon: UserPlus },
      { href: `${base}/customers`, label: "Add customer", icon: Users },
      { href: `${base}/quotations/new`, label: "New quotation", icon: FileSpreadsheet },
      { href: `${base}/sale-invoices/new`, label: "New invoice", icon: ReceiptIcon },
      { href: `${base}/projects`, label: "Projects", icon: FolderKanban },
      { href: `${base}/employees`, label: "Team", icon: IdCard },
    );
  } else if (role === "sales_manager") {
    actions.push(
      { href: `${base}/leads`, label: "New lead", icon: UserPlus },
      { href: `${base}/customers`, label: "Add customer", icon: Users },
      { href: `${base}/quotations/new`, label: "New quotation", icon: FileSpreadsheet },
      { href: `${base}/proposals`, label: "AI proposals", icon: Sparkles },
    );
  } else if (role === "sales_executive") {
    actions.push(
      { href: `${base}/leads`, label: "My leads", icon: UserPlus },
      { href: `${base}/customers`, label: "My customers", icon: Users },
      { href: `${base}/quotations/new`, label: "New quotation", icon: FileSpreadsheet },
    );
  } else if (role === "accounts") {
    actions.push(
      { href: `${base}/sale-invoices/new`, label: "New invoice", icon: ReceiptIcon },
      { href: `${base}/receipts/new`, label: "Record receipt", icon: Banknote },
      { href: `${base}/purchase-invoices/new`, label: "New purchase invoice", icon: ClipboardCheck },
      { href: `${base}/payments/new`, label: "Record payment", icon: CreditCard },
      { href: `${base}/vendors`, label: "Vendors", icon: Truck },
      { href: `${base}/recovery`, label: "Recovery", icon: Briefcase },
    );
  } else if (role === "project_manager") {
    actions.push(
      { href: `${base}/projects`, label: "Open projects", icon: FolderKanban },
      { href: `${base}/customers`, label: "Customers", icon: Users },
    );
  } else if (role === "team_member") {
    actions.push(
      { href: `${base}/projects`, label: "My projects", icon: FolderKanban },
    );
  } else if (role === "hr") {
    actions.push(
      { href: `${base}/employees`, label: "Manage team", icon: IdCard },
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="relative flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-white/60 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Quick actions
      </span>
      <span className="text-zinc-300 dark:text-zinc-700">·</span>
      {actions.map((a) => (
        <QuickAction key={a.href} href={a.href} icon={a.icon} label={a.label} />
      ))}
    </div>
  );
}
