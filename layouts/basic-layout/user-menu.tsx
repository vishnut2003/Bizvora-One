"use client";

import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  LayoutGrid,
  LogOut,
  Shield,
  UserCircle,
} from "lucide-react";

type UserMenuProps = {
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
};

function Avatar({
  name,
  email,
  image,
  className,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  className?: string;
}) {
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className={className}
      />
    );
  }

  return (
    <span
      className={`grid place-items-center bg-linear-to-br from-primary to-secondary font-semibold text-white ${className ?? ""}`}
    >
      {initial}
    </span>
  );
}

export default function UserMenu({
  name,
  email,
  image,
  isAdmin,
  signOutAction,
}: UserMenuProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Open account menu"
        className="group flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 py-1 pl-1 pr-2 text-zinc-700 backdrop-blur transition-colors hover:border-zinc-300 hover:bg-white data-[state=open]:border-zinc-300 data-[state=open]:bg-white dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:data-[state=open]:border-zinc-700 dark:data-[state=open]:bg-zinc-900"
      >
        <Avatar
          name={name}
          email={email}
          image={image}
          className="h-7 w-7 rounded-full text-[11px] ring-1 ring-zinc-200 dark:ring-white/10"
        />
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-60 p-1.5">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar
            name={name}
            email={email}
            image={image}
            className="h-9 w-9 shrink-0 rounded-full text-sm ring-1 ring-zinc-200 dark:ring-white/10"
          />
          <div className="min-w-0">
            {name ? (
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {name}
              </p>
            ) : null}
            {email ? (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

        <Link
          href="/my-account"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <UserCircle className="h-4 w-4 text-zinc-400" />
          My account
        </Link>

        <Link
          href="/workspace"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <LayoutGrid className="h-4 w-4 text-zinc-400" />
          Workspaces
        </Link>

        {isAdmin ? (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Shield className="h-4 w-4 text-zinc-400" />
            Admin
          </Link>
        ) : null}

        <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-700 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
