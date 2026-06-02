"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/config/auth";
import { connectDB } from "@/config/db";
import User from "@/models/user";

export type SignupState =
  | {
      errors?: {
        name?: string;
        email?: string;
        password?: string;
        terms?: string;
      };
      formError?: string;
    }
  | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("terms") === "on";

  const errors: NonNullable<SignupState>["errors"] = {};
  if (name.length < 2) errors.name = "Please enter your full name.";
  if (!EMAIL_RE.test(email))
    errors.email = "Please enter a valid email address.";
  if (password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  if (!acceptedTerms)
    errors.terms = "Please accept the Terms of Service and Privacy Policy.";

  if (Object.keys(errors).length) return { errors };

  await connectDB();

  try {
    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      providers: ["credentials"],
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return {
        errors: { email: "An account with this email already exists." },
      };
    }
    return { formError: "Couldn't create your account. Please try again." };
  }

  // signIn throws a redirect; let it propagate.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/workspace",
  });
}
