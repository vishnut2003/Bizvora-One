"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import Workspace from "@/models/workspace";
import { WORKSPACE_COLORS, type WorkspaceColor } from "@/lib/workspace";

export type CreateWorkspaceState =
  | {
      ok?: boolean;
      workspaceId?: string;
      errors?: { name?: string };
      formError?: string;
    }
  | undefined;

function isWorkspaceColor(value: string): value is WorkspaceColor {
  return (WORKSPACE_COLORS as readonly string[]).includes(value);
}

export async function createWorkspace(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const colorInput = String(formData.get("color") ?? "");
  const color: WorkspaceColor = isWorkspaceColor(colorInput)
    ? colorInput
    : "violet";

  if (name.length < 2) {
    return { errors: { name: "Name must be at least 2 characters." } };
  }
  if (name.length > 80) {
    return { errors: { name: "Name must be 80 characters or fewer." } };
  }

  await connectDB();

  let workspaceId: string;
  try {
    const created = await Workspace.create({
      name,
      color,
      status: "pending_payment",
      owner: session.user.id,
      members: [{ user: session.user.id, role: "owner" }],
    });
    workspaceId = String(created._id);
  } catch {
    return { formError: "Couldn't create workspace. Please try again." };
  }

  revalidatePath("/workspace");
  return { ok: true, workspaceId };
}
