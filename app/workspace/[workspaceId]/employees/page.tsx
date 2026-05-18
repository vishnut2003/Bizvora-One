import type { Metadata } from "next";
import { Users } from "lucide-react";
import User from "@/models/user";
import type { UserRole } from "@/lib/user";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { cn } from "@/lib/cn";
import DashboardLayout from "@/layouts/dashboard-layout";
import AddEmployeeButton from "./_components/add-employee-button";

const HR_PAGE_ROLES: UserRole[] = ["owner", "admin", "hr"];

export const metadata: Metadata = {
  title: "Employees — WSS CRM",
};

type EmployeesPageProps = {
  params: Promise<{ workspaceId: string }>;
};

const roleLabel: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  accounts: "Accounts",
  hr: "HR",
};

const roleStyle: Record<UserRole, string> = {
  owner:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 dark:bg-primary/15 dark:ring-primary/25",
  admin:
    "bg-zinc-900/10 text-zinc-900 ring-1 ring-inset ring-zinc-900/15 dark:bg-zinc-100/10 dark:text-zinc-100 dark:ring-zinc-100/15",
  sales_manager:
    "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
  sales_executive:
    "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  accounts:
    "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  hr: "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
};

function formatJoined(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
  const { workspaceId } = await params;

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: HR_PAGE_ROLES,
  });

  const memberUserIds = (doc.members ?? []).map((m) => m.user);
  const allUserIds = Array.from(
    new Set([String(doc.owner), ...memberUserIds.map(String)]),
  );

  const users = await User.find({ _id: { $in: allUserIds } })
    .select("name email image role createdAt")
    .lean();

  const userById = new Map(users.map((u) => [String(u._id), u]));

  const ownerIdStr = String(doc.owner);
  const ownerUser = userById.get(ownerIdStr);

  const owner = ownerUser
    ? {
        id: ownerIdStr,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image ?? null,
        joinedAt: (ownerUser.createdAt as Date) ?? new Date(),
      }
    : null;

  const employees = (doc.members ?? [])
    .filter((m) => String(m.user) !== ownerIdStr)
    .map((m) => {
      const u = userById.get(String(m.user));
      return u
        ? {
            id: String(m.user),
            name: u.name,
            email: u.email,
            image: u.image ?? null,
            role: m.role as UserRole,
            joinedAt: (u.createdAt as Date) ?? new Date(),
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const canManage = HR_PAGE_ROLES.includes(myRole);

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role: myRole,
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              For HR
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Employees
            </h1>
            <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
              People with access to{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {workspace.name}
              </span>
              .
            </p>
          </div>
          {canManage ? (
            <AddEmployeeButton workspaceId={workspace.id} />
          ) : null}
        </div>

        {owner ? (
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white via-white to-primary/[0.04] p-5 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-primary/[0.08]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 blur-2xl"
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              Workspace owner
            </p>
            <div className="mt-3 flex items-center gap-3.5">
              {owner.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={owner.image}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                />
              ) : (
                <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-[16px] font-semibold text-white shadow-sm shadow-primary/25">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                  />
                  <span className="relative">
                    {owner.name.charAt(0).toUpperCase()}
                  </span>
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {owner.name}
                  {owner.id === session.user.id ? (
                    <span className="ml-2 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                  {owner.email}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                  roleStyle.owner,
                )}
              >
                {roleLabel.owner}
              </span>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Users
                aria-hidden
                className="h-4 w-4 text-zinc-400 dark:text-zinc-500"
              />
              <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                {employees.length}{" "}
                {employees.length === 1 ? "employee" : "employees"}
              </h2>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                No employees yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {employees.map((emp) => {
                const initial = emp.name.charAt(0).toUpperCase();
                return (
                  <li
                    key={emp.id}
                    className="flex items-center gap-3.5 px-5 py-3.5"
                  >
                    {emp.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={emp.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                      />
                    ) : (
                      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-[14px] font-semibold text-white shadow-sm shadow-primary/20">
                        <span
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                        />
                        <span className="relative">{initial}</span>
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {emp.name}
                        {emp.id === session.user.id ? (
                          <span className="ml-2 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                        {emp.email}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                        roleStyle[emp.role],
                      )}
                    >
                      {roleLabel[emp.role]}
                    </span>

                    <span className="hidden shrink-0 text-[11px] tabular-nums text-zinc-400 sm:inline dark:text-zinc-500">
                      Joined {formatJoined(new Date(emp.joinedAt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
