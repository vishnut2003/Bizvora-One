import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users2 } from "lucide-react";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { EMPLOYEE_MANAGER_ROLES } from "@/lib/user";
import type { WorkspaceColor } from "@/lib/workspace";
import DashboardLayout from "@/layouts/dashboard-layout";
import EmployeeForm, {
  EMPTY_EMPLOYEE_DEFAULTS,
} from "../_components/employee-form";
import { getLinkCandidates } from "../_lib/link-candidates";

export const metadata: Metadata = {
  title: "New Employee — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export default async function NewEmployeePage({ params }: Props) {
  const { workspaceId } = await params;
  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: EMPLOYEE_MANAGER_ROLES,
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  const linkCandidates = await getLinkCandidates(doc);

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${workspace.id}/employees`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Employees
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <Users2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              New employee
            </h1>
            <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Add someone to payroll. Optionally link an existing workspace user.
            </p>
          </div>
        </div>

        <EmployeeForm
          mode="create"
          workspaceId={workspace.id}
          defaults={EMPTY_EMPLOYEE_DEFAULTS}
          linkCandidates={linkCandidates}
        />
      </div>
    </DashboardLayout>
  );
}
