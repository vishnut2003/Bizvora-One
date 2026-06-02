"use server";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import User, { USER_ROLES, type UserRole } from "@/models/user";
import Workspace from "@/models/workspace";
import { assignableRolesFor, canManageEmployees } from "@/lib/user";
import { getActorRole } from "@/lib/workspace-access";

export type AddEmployeeState =
  | {
      ok?: boolean;
      errors?: {
        name?: string;
        email?: string;
        password?: string;
        role?: string;
      };
      formError?: string;
    }
  | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export async function addEmployee(
  workspaceId: string,
  _prev: AddEmployeeState,
  formData: FormData,
): Promise<AddEmployeeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleInput = String(formData.get("role") ?? "");

  const errors: NonNullable<AddEmployeeState>["errors"] = {};
  if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";
  if (!isUserRole(roleInput) || roleInput === "owner")
    errors.role = "Please choose a valid role.";
  if (Object.keys(errors).length) return { errors };

  const role = roleInput as UserRole;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageEmployees(actorRole)) {
    return { formError: "You don't have permission to add employees." };
  }

  if (!assignableRolesFor(actorRole).includes(role)) {
    return {
      errors: { role: "You're not allowed to assign this role." },
    };
  }

  let user = await User.findOne({ email });

  if (user) {
    const alreadyMember = workspace.members?.some(
      (m) => String(m.user) === String(user!._id),
    );
    if (alreadyMember) {
      return { errors: { email: "This user is already a workspace member." } };
    }
  } else {
    if (name.length < 2) {
      return { errors: { name: "Please enter a name." } };
    }
    if (password.length < 8) {
      return {
        errors: { password: "Password must be at least 8 characters." },
      };
    }
    try {
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        providers: ["credentials"],
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return {
          errors: { email: "An account with this email already exists." },
        };
      }
      return { formError: "Couldn't create the user. Please try again." };
    }
  }

  if (
    workspace.maxMembers != null &&
    workspace.members.length >= workspace.maxMembers
  ) {
    return {
      formError: `This workspace has reached its member limit (${workspace.maxMembers}). Ask a platform admin to raise it.`,
    };
  }

  workspace.members.push({ user: user._id, role });
  try {
    await workspace.save();
  } catch (err) {
    console.error("[addEmployee] workspace.save failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't add the employee.";
    return { formError: `${message} Please try again.` };
  }

  revalidatePath(`/workspace/${workspaceId}/employees`);
  return { ok: true };
}

export type UpdateEmployeeState =
  | {
      ok?: boolean;
      errors?: {
        name?: string;
        password?: string;
        role?: string;
      };
      formError?: string;
    }
  | undefined;

export async function updateEmployee(
  workspaceId: string,
  employeeId: string,
  _prev: UpdateEmployeeState,
  formData: FormData,
): Promise<UpdateEmployeeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(employeeId)
  ) {
    return { formError: "Invalid identifier." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleInput = String(formData.get("role") ?? "");

  const errors: NonNullable<UpdateEmployeeState>["errors"] = {};
  if (name.length < 2) errors.name = "Please enter a name.";
  if (!isUserRole(roleInput) || roleInput === "owner")
    errors.role = "Please choose a valid role.";
  if (password.length > 0 && password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  if (Object.keys(errors).length) return { errors };

  const role = roleInput as UserRole;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageEmployees(actorRole)) {
    return { formError: "You don't have permission to edit employees." };
  }

  if (String(workspace.owner) === employeeId) {
    return { formError: "The workspace owner can't be edited from this page." };
  }

  const membership = workspace.members?.find(
    (m) => String(m.user) === employeeId,
  );
  if (!membership) {
    return { formError: "This employee isn't part of the workspace." };
  }

  const allowedRoles = assignableRolesFor(actorRole);
  const currentRole = membership.role as UserRole;
  if (!allowedRoles.includes(currentRole)) {
    return {
      formError: "You're not allowed to edit a user with this role.",
    };
  }
  if (!allowedRoles.includes(role)) {
    return {
      errors: { role: "You're not allowed to assign this role." },
    };
  }

  const isSelf = session.user.id === employeeId;
  if (isSelf && membership.role !== role) {
    return {
      errors: { role: "You can't change your own role." },
    };
  }

  const user = await User.findById(employeeId);
  if (!user) return { formError: "User not found." };

  user.name = name;
  if (password.length >= 8) {
    user.password = await bcrypt.hash(password, 10);
    if (!user.providers.includes("credentials")) {
      user.providers.push("credentials");
    }
  }

  membership.role = role;

  try {
    await Promise.all([user.save(), workspace.save()]);
  } catch (err) {
    console.error("[updateEmployee] save failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't update the employee.";
    return { formError: `${message} Please try again.` };
  }

  revalidatePath(`/workspace/${workspaceId}/employees`);
  return { ok: true };
}

export type RemoveEmployeeState =
  | { ok?: boolean; formError?: string }
  | undefined;

export async function removeEmployee(
  workspaceId: string,
  employeeId: string,
): Promise<RemoveEmployeeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(employeeId)
  ) {
    return { formError: "Invalid identifier." };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageEmployees(actorRole)) {
    return { formError: "You don't have permission to remove employees." };
  }

  if (String(workspace.owner) === employeeId) {
    return { formError: "The workspace owner can't be removed." };
  }
  if (session.user.id === employeeId) {
    return { formError: "You can't remove yourself from the workspace." };
  }

  const membership = workspace.members?.find(
    (m) => String(m.user) === employeeId,
  );
  if (!membership) {
    return { formError: "This employee isn't part of the workspace." };
  }

  const allowedRoles = assignableRolesFor(actorRole);
  if (!allowedRoles.includes(membership.role as UserRole)) {
    return {
      formError: "You're not allowed to remove a user with this role.",
    };
  }

  workspace.members = workspace.members.filter(
    (m) => String(m.user) !== employeeId,
  ) as typeof workspace.members;

  try {
    await workspace.save();
  } catch (err) {
    console.error("[removeEmployee] workspace.save failed", err);
    const message =
      err instanceof Error ? err.message : "Couldn't remove the employee.";
    return { formError: `${message} Please try again.` };
  }

  revalidatePath(`/workspace/${workspaceId}/employees`);
  return { ok: true };
}

export type WorkspaceCandidate = {
  id: string;
  name: string;
  email: string;
};

export type SearchCandidatesResult =
  | { ok: true; results: WorkspaceCandidate[] }
  | { ok: false; error: string };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Search the user directory by email so a manager can attach an existing
// account to the workspace. Excludes users who are already members.
export async function searchWorkspaceCandidates(
  workspaceId: string,
  query: string,
): Promise<SearchCandidatesResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, error: "Invalid workspace." };
  }

  const q = query.trim();
  if (q.length < 2) {
    return { ok: true, results: [] };
  }

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found." };

  const actorRole = getActorRole(workspace, session.user.id);
  if (!canManageEmployees(actorRole)) {
    return { ok: false, error: "You don't have permission." };
  }

  const excluded = [
    workspace.owner,
    ...(workspace.members ?? []).map((m) => m.user),
  ];

  const docs = await User.find({
    _id: { $nin: excluded },
    email: new RegExp("^" + escapeRegex(q), "i"),
  })
    .select("name email")
    .limit(8)
    .lean();

  return {
    ok: true,
    results: docs.map((u) => ({
      id: String(u._id),
      name: u.name ?? "",
      email: u.email,
    })),
  };
}
