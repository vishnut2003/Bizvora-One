"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/config/auth";

export type LoginState =
  | {
      errors?: {
        email?: string;
        password?: string;
      };
      formError?: string;
    }
  | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/workspace");

  const errors: NonNullable<LoginState>["errors"] = {};
  if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";
  if (!password) errors.password = "Please enter your password.";
  if (Object.keys(errors).length) return { errors };

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code =
        "code" in error && typeof error.code === "string" ? error.code : "";
      if (code === "wrong_provider") {
        return {
          formError:
            "This account was created with Google. Use the Google button above to sign in.",
        };
      }
      if (error.type === "CredentialsSignin") {
        return { formError: "Invalid email or password. Please try again." };
      }
      return { formError: "Couldn't sign in. Please try again." };
    }
    throw error;
  }
}
