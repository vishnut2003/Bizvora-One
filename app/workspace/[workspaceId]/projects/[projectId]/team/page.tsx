import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Users } from "lucide-react";
import Project, { type IProject } from "@/models/project";
import User from "@/models/user";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PROJECT_VIEWER_ROLES, canManageProjects } from "@/lib/project";
import ProjectTeamManager, {
  type ProjectTeamMember,
} from "../_components/project-team-manager";

export const metadata: Metadata = {
  title: "Project Team — WSS CRM",
};

type Props = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

type LeanProject = Omit<IProject, "team"> & {
  _id: { toString(): string };
  team: Array<{ toString(): string }>;
};

type LeanUser = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  image?: string | null;
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function ProjectTeamPage({ params }: Props) {
  const { workspaceId, projectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();

  const {
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const project = (await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  })
    .select("team")
    .lean()) as LeanProject | null;

  if (!project) notFound();

  const canManage = canManageProjects(role);
  const defaultTeam = (project.team ?? []).map((t) => String(t));

  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];

  const usersRaw = (await User.find({ _id: { $in: memberIds } })
    .select("name email image")
    .lean()) as unknown as LeanUser[];

  const members: ProjectTeamMember[] = usersRaw.map((u) => ({
    id: String(u._id),
    name: u.name ?? u.email ?? "Member",
    email: u.email ?? "",
    image: u.image ?? null,
  }));

  const currentTeam = members.filter((m) => defaultTeam.includes(m.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
          <Users className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            Team
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            {canManage
              ? "Add or remove the teammates working on this project."
              : "The teammates working on this project."}
          </p>
        </div>
      </div>

      {canManage ? (
        <ProjectTeamManager
          workspaceId={workspaceId}
          projectId={projectId}
          defaultTeam={defaultTeam}
          members={members}
        />
      ) : currentTeam.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-5 text-[12.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No one&apos;s assigned to this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {currentTeam.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-semibold text-white">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(m.name)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  {m.name}
                </p>
                {m.email ? (
                  <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                    {m.email}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
