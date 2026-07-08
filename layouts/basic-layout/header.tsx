import Link from "next/link";
import Logo from "@/components/logo";
import { buttonClasses } from "@/components/button";
import { ArrowRight } from "lucide-react";
import { auth, signOut } from "@/config/auth";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import UserMenu from "./user-menu";

const navLinks = [
  { href: "/#modules", label: "Modules" },
  { href: "/#roles", label: "Roles" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group relative flex items-center gap-2.5">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-3 -top-2 -z-10 h-10 w-20 rounded-full bg-linear-to-r from-primary/30 to-secondary/30 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          />
          <Logo />
          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline-block">
            Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              {link.label}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-center scale-x-0 rounded-full bg-linear-to-r from-primary to-secondary opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100"
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu
              name={user.name ?? null}
              email={user.email ?? null}
              image={user.image ?? null}
              isAdmin={isPlatformAdminEmail(user.email)}
              signOutAction={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            />
          ) : (
            <>
              <Link
                href="/login"
                className={buttonClasses({
                  variant: "ghost",
                  size: "sm",
                  className: "hidden sm:inline-flex",
                })}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
      />
    </header>
  );
}
