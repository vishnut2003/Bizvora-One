"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import Button from "@/components/button";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { logoutAction } from "./actions";

type LogoutButtonProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userInitial: string;
};

export default function LogoutButton({ user, userInitial }: LogoutButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const accountLabel = user.email ?? user.name ?? "this account";

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
  }

  function confirmLogout() {
    startTransition(async () => {
      await logoutAction();
      // signOut redirects to /login, so we won't usually reach here.
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sign out"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white pl-1 pr-2 text-[12px] text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-6 w-6 rounded-[5px] ring-1 ring-zinc-200 dark:ring-zinc-700"
          />
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-gradient-to-br from-primary to-secondary text-[10px] font-semibold text-white">
            {userInitial}
          </span>
        )}
        <span className="hidden max-w-[160px] truncate sm:inline">
          {user.email ?? user.name}
        </span>
        <span className="mx-0.5 hidden h-3 w-px bg-zinc-200 sm:inline-block dark:bg-zinc-700" />
        <LogOut className="h-3.5 w-3.5" />
      </button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Sign out?
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            You&apos;ll be signed out of{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {accountLabel}
            </span>{" "}
            and returned to the login page.
          </DialogDescription>
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="-mx-6 flex items-center justify-end gap-2 border-t border-zinc-100 px-6 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={confirmLogout}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </Popup>
    </>
  );
}
