import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import type { ComponentType, SVGProps } from "react";
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import Project from "@/models/project";
import ProjectFile, { type ProjectFileKind } from "@/models/project-file";
import User from "@/models/user";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { PROJECT_VIEWER_ROLES, canManageProjects } from "@/lib/project";
import { timeAgo } from "@/lib/time";
import AddFileControls from "./_components/add-file-controls";
import DeleteFileButton from "./_components/delete-file-button";

export const metadata: Metadata = {
  title: "Project Files — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

type LeanFile = {
  _id: { toString(): string };
  kind: ProjectFileKind;
  name: string;
  storagePath?: string;
  originalName?: string;
  contentType?: string;
  size?: number;
  url?: string;
  uploadedBy: { toString(): string };
  createdAt: Date;
};

type LeanUser = {
  _id: { toString(): string };
  name?: string;
  email?: string;
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function iconFor(
  kind: ProjectFileKind,
  contentType: string,
): ComponentType<SVGProps<SVGSVGElement>> {
  if (kind === "link") return Link2;
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType === "application/pdf") return FileText;
  if (
    contentType.includes("zip") ||
    contentType.includes("compressed") ||
    contentType.includes("tar")
  ) {
    return FileArchive;
  }
  if (contentType.startsWith("text/")) return FileText;
  return FileIcon;
}

export default async function ProjectFilesPage({ params }: Props) {
  const { workspaceId, projectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) notFound();

  const { session, role } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: [...PROJECT_VIEWER_ROLES],
  });

  const project = await Project.exists({
    _id: projectId,
    workspace: workspaceId,
  });
  if (!project) notFound();

  const filesRaw = (await ProjectFile.find({
    project: projectId,
    workspace: workspaceId,
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean()) as unknown as LeanFile[];

  const uploaderIds = Array.from(
    new Set(filesRaw.map((f) => String(f.uploadedBy))),
  );
  const usersRaw = (await User.find({ _id: { $in: uploaderIds } })
    .select("name email")
    .lean()) as unknown as LeanUser[];
  const userById = new Map(
    usersRaw.map((u) => [
      String(u._id),
      u.name ?? u.email ?? "Someone",
    ]),
  );

  const canManage = canManageProjects(role);
  const currentUserId = session.user.id;

  const files = filesRaw.map((f) => {
    const id = String(f._id);
    const uploadedById = String(f.uploadedBy);
    return {
      id,
      kind: f.kind,
      name: f.name,
      contentType: f.contentType ?? "",
      size: f.size ?? 0,
      url: f.url ?? "",
      uploaderName: userById.get(uploadedById) ?? "Someone",
      createdAt: f.createdAt,
      href:
        f.kind === "link"
          ? f.url ?? "#"
          : `/workspace/${workspaceId}/projects/${projectId}/files/${id}/download`,
      canDelete: canManage || uploadedById === currentUserId,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
            <FolderOpen className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
              Files
            </h2>
            <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
              {files.length === 0
                ? "Upload files or add resource links for this project."
                : `${files.length} ${files.length === 1 ? "item" : "items"}`}
            </p>
          </div>
        </div>
        <AddFileControls workspaceId={workspaceId} projectId={projectId} />
      </div>

      {files.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col items-center justify-center">
            <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30">
              <FolderOpen className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
              Nothing here yet
            </h3>
            <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Upload a document or image, or add a link to a resource that lives
              elsewhere.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {files.map((f) => {
            const Icon = iconFor(f.kind, f.contentType);
            const external = f.kind === "link";
            return (
              <li
                key={f.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"
              >
                <span
                  className={
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg " +
                    (external
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300")
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>

                <a
                  href={f.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="min-w-0 flex-1"
                >
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-zinc-900 group-hover:text-primary dark:text-zinc-100">
                    <span className="truncate">{f.name}</span>
                    {external ? (
                      <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                    {external ? "Link" : formatBytes(f.size)} · {f.uploaderName}{" "}
                    · {timeAgo(new Date(f.createdAt))}
                  </p>
                </a>

                <a
                  href={f.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  aria-label={external ? `Open ${f.name}` : `Download ${f.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  {external ? (
                    <ExternalLink className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </a>

                {f.canDelete ? (
                  <DeleteFileButton
                    workspaceId={workspaceId}
                    projectId={projectId}
                    fileId={f.id}
                    fileName={f.name}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
