import Link from "next/link";
import { Shield } from "lucide-react";
import LogoutButton from "@/layouts/dashboard-layout/logout-button";
import MobileSidebar from "./mobile-sidebar";

type HeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export default function Header({ user }: HeaderProps) {
  const userInitial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <MobileSidebar />
          <Link
            href="/admin"
            className="flex shrink-0 items-baseline text-[15px] font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Bizvora
            </span>
            <span className="ml-1 text-zinc-900 dark:text-white">One</span>
            <span
              aria-hidden
              className="ml-0.5 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-gradient-to-br from-primary to-secondary"
            />
          </Link>

          <span className="h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-800" />

          <span className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[5px] bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
              />
              <Shield className="relative h-3 w-3" />
            </span>
            <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
              Admin Console
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LogoutButton user={user} userInitial={userInitial} />
        </div>
      </div>
    </header>
  );
}
