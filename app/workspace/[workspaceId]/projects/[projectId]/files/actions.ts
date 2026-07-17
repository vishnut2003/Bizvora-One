"use server";

import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Project from "@/models/project";
import ProjectFile from "@/models/project-file";
import { getActorRole } from "@/lib/workspace-access";
import { canManageProjects, canViewAllProjects } from "@/lib/project";
import { deleteFile, uploadFile } from "@/lib/storage";

// Vercel serverless caps the request body at ~4.5 MB, which this server-side
// upload path must stay under. Files near the ceiling can still 413 once
// multipart form overhead is added.
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024; // ~4.5 MB

export type FileActionState = {
  ok?: true;
  formError?: string;
  errors?: { name?: string; file?: string; url?: string };
};

export type DeleteFileState = { ok: true } | { ok: false; error: string };

type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

type ProjectContext = {
  ok: true;
  session: AuthedSession;
  role: ReturnType<typeof getActorRole>;
};

// Loads the actor + verifies they can access this project. Team members are
// scoped to projects they're on; everyone with a project-viewer role else.
async function loadProjectContext(
  workspaceId: string,
  projectId: string,
): Promise<ProjectContext | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(projectId)
  ) {
    return { ok: false, error: "Invalid identifier." };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found." };

  const role = getActorRole(workspace, session.user.id);

  const project = (await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  })
    .select("team")
    .lean()) as { team?: Array<{ toString(): string }> } | null;
  if (!project) return { ok: false, error: "Project not found." };

  if (!canViewAllProjects(role)) {
    const onTeam = (project.team ?? []).some(
      (t) => String(t) === session.user.id,
    );
    if (!onTeam) {
      return { ok: false, error: "You don't have access to this project." };
    }
  }

  return { ok: true, session: session as AuthedSession, role };
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\- ]+/g, "_").trim();
  return cleaned.slice(0, 180) || "file";
}

export async function uploadProjectFile(
  workspaceId: string,
  projectId: string,
  _prev: FileActionState,
  formData: FormData,
): Promise<FileActionState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { formError: ctx.error };

  const file = formData.get("file");
  const customName = String(formData.get("name") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: "Choose a file to upload." } };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { errors: { file: "File is too large (max 4.5 MB)." } };
  }

  const originalName = sanitizeFileName(file.name);
  const displayName = customName.slice(0, 200) || originalName;

  const destination = `workspaces/${workspaceId}/projects/${projectId}/files/${randomUUID()}-${originalName}`;

  let storageUrl: string;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    storageUrl = await uploadFile(bytes, destination, {
      contentType: file.type || "application/octet-stream",
    });
  } catch (err) {
    console.error("[uploadProjectFile] storage upload failed", err);
    return { formError: "Couldn't upload the file. Please try again." };
  }

  try {
    await ProjectFile.create({
      workspace: workspaceId,
      project: projectId,
      kind: "upload",
      name: displayName,
      // Full public Blob URL — used directly by the download routes.
      storagePath: storageUrl,
      originalName,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      uploadedBy: ctx.session.user.id,
    });
  } catch (err) {
    console.error("[uploadProjectFile] db write failed", err);
    // Roll back the orphaned object so storage and DB stay consistent.
    try {
      await deleteFile(storageUrl);
    } catch {
      /* best-effort cleanup */
    }
    return { formError: "Couldn't save the file. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/files`);
  return { ok: true };
}

export async function addProjectResourceLink(
  workspaceId: string,
  projectId: string,
  _prev: FileActionState,
  formData: FormData,
): Promise<FileActionState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { formError: ctx.error };

  const name = String(formData.get("name") ?? "").trim();
  const urlRaw = String(formData.get("url") ?? "").trim();

  const errors: NonNullable<FileActionState["errors"]> = {};
  if (!name) errors.name = "Give the link a name.";
  else if (name.length > 200) errors.name = "Name is too long (max 200).";

  let normalizedUrl = "";
  try {
    const parsed = new URL(urlRaw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      errors.url = "Enter an http(s) link.";
    } else {
      normalizedUrl = parsed.toString();
    }
  } catch {
    errors.url = "Enter a valid URL.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  try {
    await ProjectFile.create({
      workspace: workspaceId,
      project: projectId,
      kind: "link",
      name,
      url: normalizedUrl,
      uploadedBy: ctx.session.user.id,
    });
  } catch (err) {
    console.error("[addProjectResourceLink] failed", err);
    return { formError: "Couldn't add the link. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/files`);
  return { ok: true };
}

export async function deleteProjectFile(
  workspaceId: string,
  projectId: string,
  fileId: string,
): Promise<DeleteFileState> {
  const ctx = await loadProjectContext(workspaceId, projectId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return { ok: false, error: "Invalid file id." };
  }

  const file = await ProjectFile.findOne({
    _id: fileId,
    project: projectId,
    workspace: workspaceId,
  });
  if (!file) return { ok: false, error: "File not found." };

  // The uploader can remove their own file; project managers can remove any.
  const isUploader = String(file.uploadedBy) === ctx.session.user.id;
  if (!isUploader && !canManageProjects(ctx.role)) {
    return { ok: false, error: "You can't remove this file." };
  }

  if (file.kind === "upload" && file.storagePath) {
    try {
      await deleteFile(file.storagePath);
    } catch (err) {
      // The stored object may already be gone — don't block the DB delete.
      console.error("[deleteProjectFile] storage delete failed", err);
    }
  }

  await ProjectFile.deleteOne({ _id: file._id });

  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}/files`);
  return { ok: true };
}
