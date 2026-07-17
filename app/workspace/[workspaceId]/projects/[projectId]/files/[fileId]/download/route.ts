import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import Project from "@/models/project";
import ProjectFile from "@/models/project-file";
import { getActorRole } from "@/lib/workspace-access";
import { canViewAllProjects } from "@/lib/project";

type WorkspaceLike = {
  owner: unknown;
  members?: ReadonlyArray<{ user: unknown; role: string }>;
};

function isMember(workspace: WorkspaceLike, userId: string): boolean {
  if (String(workspace.owner) === userId) return true;
  return workspace.members?.some((m) => String(m.user) === userId) ?? false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; projectId: string; fileId: string }> },
) {
  const { workspaceId, projectId, fileId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(fileId)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  await connectDB();

  const workspace = (await Workspace.findById(workspaceId)
    .select("owner members")
    .lean()) as WorkspaceLike | null;
  if (!workspace || !isMember(workspace, session.user.id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const role = getActorRole(workspace, session.user.id);

  const [file, project] = await Promise.all([
    ProjectFile.findOne({
      _id: fileId,
      project: projectId,
      workspace: workspaceId,
    }).lean() as Promise<{
      kind: string;
      storagePath?: string;
      url?: string;
    } | null>,
    Project.findOne({ _id: projectId, workspace: workspaceId })
      .select("team")
      .lean() as Promise<{ team?: Array<{ toString(): string }> } | null>,
  ]);

  if (!file || !project) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Team members can only reach files of projects they're on.
  if (!canViewAllProjects(role)) {
    const onTeam = (project.team ?? []).some(
      (t) => String(t) === session.user.id,
    );
    if (!onTeam) return new NextResponse("Forbidden", { status: 403 });
  }

  if (file.kind === "link") {
    if (!file.url) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(file.url);
  }

  if (!file.storagePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  // storagePath holds the full public Blob URL. Redirect straight to it — the
  // auth/membership checks above gate who can reach this route.
  return NextResponse.redirect(file.storagePath);
}
