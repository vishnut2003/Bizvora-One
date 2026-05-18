import mongoose, { type Types } from "mongoose";
import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import type { UserRole } from "@/lib/user";
import type { WorkspaceColor } from "@/lib/workspace";

export type WorkspaceMember = {
  user: Types.ObjectId;
  role: UserRole;
};

export type LeanWorkspace = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  color: WorkspaceColor;
  owner: Types.ObjectId;
  members: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceAccess = {
  session: Session & {
    user: NonNullable<Session["user"]> & { id: string };
  };
  workspace: LeanWorkspace;
  role: UserRole;
};

export type RequireWorkspaceAccessOptions = {
  workspaceId: string;
  allowedRoles?: UserRole[];
};

export async function requireWorkspaceAccess({
  workspaceId,
  allowedRoles,
}: RequireWorkspaceAccessOptions): Promise<WorkspaceAccess> {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const workspace = (await Workspace.findOne({
    _id: workspaceId,
    $or: [{ owner: session.user.id }, { "members.user": session.user.id }],
  }).lean()) as LeanWorkspace | null;

  if (!workspace) notFound();

  const userId = session.user.id;
  const isOwner = String(workspace.owner) === userId;
  const membership = workspace.members?.find((m) => String(m.user) === userId);
  const role: UserRole = isOwner
    ? "owner"
    : (membership?.role ?? "sales_executive");

  if (allowedRoles && !allowedRoles.includes(role)) {
    notFound();
  }

  return {
    session: session as WorkspaceAccess["session"],
    workspace,
    role,
  };
}
