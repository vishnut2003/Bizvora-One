import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Lock, Settings } from "lucide-react";
import Project, { type IProject } from "@/models/project";
import Customer from "@/models/customer";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PROJECT_VIEWER_ROLES,
  canManageProjects,
  type ProjectStatus,
} from "@/lib/project";
import EditProjectForm, {
  type EditProjectDefaults,
  type ProjectFormCustomer,
} from "../_components/edit-project-form";

export const metadata: Metadata = {
  title: "Project Settings — WSS CRM",
};

type Props = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

type LeanProject = Omit<IProject, "client"> & {
  _id: { toString(): string };
  client: { toString(): string } | null;
  startDate: Date | null;
  endDate: Date | null;
};

type LeanCustomer = {
  _id: { toString(): string };
  name: string;
  company?: string;
};

function toDateInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function ProjectSettingsPage({ params }: Props) {
  const { workspaceId, projectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();

  const { role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const project = (await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  }).lean()) as LeanProject | null;

  if (!project) notFound();

  const canManage = canManageProjects(role);

  const customersRaw = (await Customer.find({ workspace: workspaceId })
    .select("name company")
    .sort({ name: 1 })
    .limit(500)
    .lean()) as unknown as LeanCustomer[];

  const customers: ProjectFormCustomer[] = customersRaw.map((c) => ({
    id: String(c._id),
    name: c.name,
    company: c.company ?? "",
  }));

  const defaults: EditProjectDefaults = {
    name: project.name,
    description: project.description ?? "",
    client: project.client ? String(project.client) : "",
    status: project.status as ProjectStatus,
    startDate: toDateInput(project.startDate),
    endDate: toDateInput(project.endDate),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-white shadow-sm dark:from-zinc-600 dark:to-zinc-800">
          <Settings className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            Settings
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            Edit this project&apos;s details, schedule and client.
          </p>
        </div>
      </div>

      {canManage ? (
        <EditProjectForm
          workspaceId={workspaceId}
          projectId={projectId}
          defaults={defaults}
          customers={customers}
        />
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">
              You can view this project, but not edit its settings.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Only the workspace owner, an admin, or a project manager can change
              project details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
