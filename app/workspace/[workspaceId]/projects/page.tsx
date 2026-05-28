import type { Metadata } from "next";
import mongoose from "mongoose";
import {
  CheckCircle2,
  CircleDashed,
  CirclePause,
  FolderKanban,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import type { FilterQuery } from "mongoose";
import Project, { type IProject } from "@/models/project";
import Customer from "@/models/customer";
import User from "@/models/user";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_VIEWER_ROLES,
  canManageProjects,
  canViewAllProjects,
  type ProjectStatus,
} from "@/lib/project";
import DashboardLayout from "@/layouts/dashboard-layout";
import AddProjectButton, {
  type ProjectFormCustomer,
  type ProjectFormMember,
} from "./_components/add-project-button";
import ProjectCard, {
  type ProjectCardData,
} from "./_components/project-card";
import ProjectsToolbar from "./_components/projects-toolbar";

export const metadata: Metadata = {
  title: "Projects — BizvoraOne",
};

type ProjectsPageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LeanProject = Omit<IProject, "client" | "team" | "createdBy" | "workspace"> & {
  _id: { toString(): string };
  client: { toString(): string } | null;
  team: Array<{ toString(): string }>;
  createdBy: { toString(): string };
  workspace: { toString(): string };
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type LeanCustomer = {
  _id: { toString(): string };
  name: string;
  company?: string;
};

type LeanUser = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  image?: string | null;
};

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isProjectStatus(v: string): v is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(v);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function ProjectsPage({
  params,
  searchParams,
}: ProjectsPageProps) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const {
    session,
    workspace: doc,
    role,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role,
  };

  // Team members are scoped to projects they're on; everyone else sees all.
  const actorScopeFilter: FilterQuery<IProject> = canViewAllProjects(role)
    ? { workspace: workspaceId }
    : { workspace: workspaceId, team: session.user.id };

  // Search/filter params.
  const q = asString(sp.q)?.trim() ?? "";
  const statusRaw = asString(sp.status) ?? "all";
  const clientRaw = asString(sp.client) ?? "all";
  const teamRaw = asString(sp.team) ?? "all";

  const listFilter: FilterQuery<IProject> = { ...actorScopeFilter };
  if (q) listFilter.name = { $regex: escapeRegex(q), $options: "i" };
  if (isProjectStatus(statusRaw)) listFilter.status = statusRaw;
  if (clientRaw === "none") {
    listFilter.client = null;
  } else if (
    clientRaw !== "all" &&
    mongoose.Types.ObjectId.isValid(clientRaw)
  ) {
    listFilter.client = clientRaw;
  }
  // Team filter is meaningful only when the actor isn't already scoped.
  if (canViewAllProjects(role)) {
    if (teamRaw === "me") {
      listFilter.team = session.user.id;
    } else if (teamRaw === "unassigned") {
      listFilter.team = { $size: 0 };
    } else if (
      teamRaw !== "all" &&
      mongoose.Types.ObjectId.isValid(teamRaw)
    ) {
      listFilter.team = teamRaw;
    }
  }

  const memberIds = [
    String(doc.owner),
    ...(doc.members ?? []).map((m) => String(m.user)),
  ];

  const [projectsRaw, customersRaw, usersRaw, statusCountsRaw] =
    await Promise.all([
      Project.find(listFilter)
        .sort({ updatedAt: -1 })
        .limit(500)
        .lean() as unknown as Promise<LeanProject[]>,
      Customer.find({ workspace: workspaceId })
        .select("name company")
        .sort({ name: 1 })
        .limit(500)
        .lean() as unknown as Promise<LeanCustomer[]>,
      User.find({ _id: { $in: memberIds } })
        .select("name email image")
        .lean() as unknown as Promise<LeanUser[]>,
      // Unfiltered status counts within the actor's scope. We can't spread
      // `actorScopeFilter` directly into `$match` because Mongoose's auto-cast
      // doesn't run inside aggregate — we must hand it ObjectIds explicitly,
      // otherwise the string user id never matches the stored ObjectId team
      // refs and team_member always sees totalCount === 0.
      Project.aggregate<{ _id: ProjectStatus; count: number }>([
        {
          $match: {
            workspace: new mongoose.Types.ObjectId(workspaceId),
            ...(canViewAllProjects(role)
              ? {}
              : { team: new mongoose.Types.ObjectId(session.user.id) }),
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

  const userById = new Map(
    usersRaw.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        name: u.name ?? u.email ?? "Member",
        image: u.image ?? null,
      },
    ]),
  );

  const customerById = new Map(
    customersRaw.map((c) => [
      String(c._id),
      { id: String(c._id), name: c.name },
    ]),
  );

  const projects: ProjectCardData[] = projectsRaw.map((p) => ({
    id: String(p._id),
    name: p.name,
    description: p.description ?? "",
    status: p.status as ProjectStatus,
    client: p.client ? customerById.get(String(p.client)) ?? null : null,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    team: p.team
      .map((t) => userById.get(String(t)))
      .filter((u): u is { id: string; name: string; image: string | null } =>
        Boolean(u),
      ),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const canAdd = canManageProjects(role);

  const formCustomers: ProjectFormCustomer[] = customersRaw.map((c) => ({
    id: String(c._id),
    name: c.name,
    company: c.company ?? "",
  }));

  const formMembers: ProjectFormMember[] = usersRaw.map((u) => ({
    id: String(u._id),
    name: u.name ?? u.email ?? "Member",
    email: u.email ?? "",
    image: u.image ?? null,
  }));

  const countBy: Record<ProjectStatus, number> = {
    planning: 0,
    active: 0,
    on_hold: 0,
    completed: 0,
    cancelled: 0,
  };
  let totalCount = 0;
  for (const row of statusCountsRaw) {
    if ((PROJECT_STATUSES as readonly string[]).includes(row._id)) {
      countBy[row._id] = row.count;
      totalCount += row.count;
    }
  }

  const filtersApplied =
    Boolean(q) ||
    statusRaw !== "all" ||
    clientRaw !== "all" ||
    (canViewAllProjects(role) && teamRaw !== "all");

  const stats: Array<{
    label: string;
    value: number;
    icon: typeof Layers;
    accent: string;
  }> = [
    {
      label: "Total",
      value: totalCount,
      icon: Layers,
      accent: "from-indigo-500 to-violet-600",
    },
    {
      label: PROJECT_STATUS_LABEL.active,
      value: countBy.active,
      icon: Zap,
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: PROJECT_STATUS_LABEL.planning,
      value: countBy.planning,
      icon: CircleDashed,
      accent: "from-sky-500 to-indigo-600",
    },
    {
      label: PROJECT_STATUS_LABEL.on_hold,
      value: countBy.on_hold,
      icon: CirclePause,
      accent: "from-amber-500 to-orange-600",
    },
    {
      label: PROJECT_STATUS_LABEL.completed,
      value: countBy.completed,
      icon: CheckCircle2,
      accent: "from-zinc-500 to-zinc-700",
    },
  ];

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.07] via-white to-violet-500/[0.06] dark:from-indigo-500/[0.16] dark:via-zinc-900 dark:to-violet-500/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 opacity-50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-violet-500/20 to-indigo-500/15 opacity-40 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <FolderKanban className="relative h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Project Management
                </p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Projects
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                  {canViewAllProjects(role)
                    ? "Every project across "
                    : "Projects you're on in "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {workspace.name}
                  </span>
                  .
                </p>
              </div>
            </div>
            {canAdd ? (
              <AddProjectButton
                workspaceId={workspace.id}
                customers={formCustomers}
                members={formMembers}
              />
            ) : null}
          </div>
        </div>

        {/* Stat cards (workspace-wide for the actor's scope, not affected by filters) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${stat.accent}`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm ${stat.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="relative mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        {totalCount > 0 ? (
          <ProjectsToolbar
            customers={formCustomers.map(({ id, name }) => ({ id, name }))}
            members={formMembers.map(({ id, name }) => ({ id, name }))}
            currentUserId={session.user.id}
            showTeamFilter={canViewAllProjects(role)}
          />
        ) : null}

        {projects.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-white to-violet-500/[0.04] dark:from-indigo-500/[0.12] dark:via-zinc-900 dark:to-violet-500/[0.10]"
            />
            <div className="relative flex flex-col items-center justify-center">
              <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                />
                <Sparkles className="relative h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[16px] font-medium text-zinc-900 dark:text-zinc-100">
                {filtersApplied
                  ? "No projects match these filters"
                  : canAdd
                    ? "No projects yet"
                    : "No projects assigned to you"}
              </h2>
              <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {filtersApplied
                  ? "Try clearing the search box or relaxing a filter from the toolbar above."
                  : canAdd
                    ? "Spin up your first project. You can link it to a customer and add teammates as you go."
                    : "Once a project manager adds you to a project, it'll show up here."}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
                  />
                  <FolderKanban className="relative h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                    {filtersApplied ? "Matching projects" : "All projects"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {projects.length}{" "}
                    {projects.length === 1 ? "project" : "projects"}
                    {filtersApplied ? ` of ${totalCount}` : ""}, most recently
                    updated first
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  href={`/workspace/${workspace.id}/projects/${p.id}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
