"use server";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import User, { USER_ROLES, type UserRole } from "@/models/user";
import Workspace from "@/models/workspace";

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
  if (name.length < 2) errors.name = "Please enter a name.";
  if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";
  if (!isUserRole(roleInput) || roleInput === "owner")
    errors.role = "Please choose a valid role.";
  if (Object.keys(errors).length) return { errors };

  const role = roleInput as UserRole;

  await connectDB();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { formError: "Workspace not found." };

  const isOwner = String(workspace.owner) === session.user.id;
  const actorMembership = workspace.members?.find(
    (m) => String(m.user) === session.user!.id,
  );
  const canManage =
    isOwner ||
    (actorMembership &&
      (actorMembership.role === "admin" || actorMembership.role === "hr"));
  if (!canManage) {
    return { formError: "You don't have permission to add employees." };
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
