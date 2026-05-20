"use server";

import { signOut } from "@/config/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
