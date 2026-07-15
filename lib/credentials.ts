import "server-only";
import bcrypt from "bcryptjs";
import { connectDB } from "@/config/db";
import User from "@/models/user";
import type { UserRole } from "@/lib/user";

export type CredentialsFailureCode =
  | "invalid_credentials"
  | "wrong_provider"
  | "account_disabled";

export type VerifiedCredentialsUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  emailVerified: boolean;
};

export type VerifyEmailPasswordResult =
  | { ok: true; user: VerifiedCredentialsUser }
  | { ok: false; code: CredentialsFailureCode };

// Single source of truth for the email/password check, shared by the
// NextAuth credentials provider (web) and the mobile login endpoint.
export async function verifyEmailPassword(
  emailInput: unknown,
  passwordInput: unknown,
): Promise<VerifyEmailPasswordResult> {
  const email =
    typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  const password = typeof passwordInput === "string" ? passwordInput : "";

  if (!email || !password) return { ok: false, code: "invalid_credentials" };

  await connectDB();
  const user = await User.findOne({ email }).select(
    "+password name email image role providers disabled emailVerified",
  );
  if (!user) return { ok: false, code: "invalid_credentials" };

  if (!user.providers.includes("credentials") || !user.password) {
    return { ok: false, code: "wrong_provider" };
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { ok: false, code: "invalid_credentials" };

  if (user.disabled) return { ok: false, code: "account_disabled" };

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      role: user.role as UserRole,
      emailVerified: Boolean(user.emailVerified),
    },
  };
}
