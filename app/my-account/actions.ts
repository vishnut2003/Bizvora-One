"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import User from "@/models/user";

export type UpdateProfileNameState =
  | {
      ok?: boolean;
      errors?: { name?: string };
      formError?: string;
    }
  | undefined;

export type UpdatePasswordState =
  | {
      ok?: boolean;
      errors?: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      };
      formError?: string;
    }
  | undefined;

export async function updateProfileName(
  _prev: UpdateProfileNameState,
  formData: FormData,
): Promise<UpdateProfileNameState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) {
    return { errors: { name: "Name must be between 2 and 60 characters." } };
  }

  await connectDB();
  await User.updateOne({ _id: session.user.id }, { $set: { name } });
  revalidatePath("/my-account/profile");
  return { ok: true };
}

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors: NonNullable<UpdatePasswordState>["errors"] = {};
  if (newPassword.length < 8)
    errors.newPassword = "Password must be at least 8 characters.";
  if (newPassword !== confirmPassword)
    errors.confirmPassword = "Passwords don't match.";
  if (Object.keys(errors).length) return { errors };

  await connectDB();
  const user = await User.findById(session.user.id).select("+password");
  if (!user) return { formError: "Account not found." };

  const hasCredentials = user.providers?.includes("credentials");

  if (hasCredentials) {
    if (!currentPassword) {
      return {
        errors: { currentPassword: "Enter your current password." },
      };
    }
    const ok = user.password
      ? await bcrypt.compare(currentPassword, user.password)
      : false;
    if (!ok) {
      return {
        errors: { currentPassword: "Current password is incorrect." },
      };
    }
  }

  user.password = await bcrypt.hash(newPassword, 10);
  if (!hasCredentials) {
    user.providers = [...(user.providers ?? []), "credentials"];
  }
  await user.save();

  return { ok: true };
}

export type UnlinkGoogleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function unlinkGoogleAccount(): Promise<UnlinkGoogleResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in." };
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("+password");
  if (!user) return { ok: false, error: "Account not found." };

  const hasCredentials = user.providers?.includes("credentials");
  if (!hasCredentials || !user.password) {
    return {
      ok: false,
      error:
        "Set a password first — otherwise you'll be locked out of your account.",
    };
  }

  user.googleId = null;
  user.providers = (user.providers ?? []).filter(
    (p) => p !== "google",
  ) as typeof user.providers;
  // Clear Google-sourced avatar so the UI falls back to initials.
  user.image = null;
  await user.save();

  revalidatePath("/my-account/profile");
  return { ok: true };
}
