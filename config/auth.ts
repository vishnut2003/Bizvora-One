import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { connectDB } from "@/config/db";
import User, { type UserRole } from "@/models/user";
import { verifyEmailPassword } from "@/lib/credentials";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class WrongProviderError extends CredentialsSignin {
  code = "wrong_provider";
}

class AccountDisabledError extends CredentialsSignin {
  code = "account_disabled";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const result = await verifyEmailPassword(
          credentials?.email,
          credentials?.password,
        );

        if (!result.ok) {
          switch (result.code) {
            case "wrong_provider":
              throw new WrongProviderError();
            case "account_disabled":
              throw new AccountDisabledError();
            default:
              throw new InvalidCredentialsError();
          }
        }

        return {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile) return false;

      const email = profile.email?.toLowerCase();
      if (!email) return false;

      await connectDB();
      let dbUser = await User.findOne({ email });

      if (!dbUser) {
        dbUser = await User.create({
          name: profile.name ?? user.name ?? email,
          email,
          image: profile.picture ?? null,
          role: "owner",
          emailVerified: profile.email_verified === true,
          providers: ["google"],
          googleId: account.providerAccountId,
        });
      } else {
        if (dbUser.disabled) return false;
        let dirty = false;
        if (!dbUser.providers.includes("google")) {
          dbUser.providers.push("google");
          dirty = true;
        }
        if (!dbUser.googleId) {
          dbUser.googleId = account.providerAccountId;
          dirty = true;
        }
        if (profile.email_verified && !dbUser.emailVerified) {
          dbUser.emailVerified = true;
          dirty = true;
        }
        const googlePicture =
          typeof profile.picture === "string" ? profile.picture : null;
        if (googlePicture && dbUser.image !== googlePicture) {
          dbUser.image = googlePicture;
          dirty = true;
        }
        if (dirty) await dbUser.save();
      }

      user.id = dbUser.id;
      user.role = dbUser.role;
      user.image = dbUser.image ?? null;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
