"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { buttonClasses } from "@/components/button";
import { unlinkGoogleAccount } from "../../actions";

type GoogleConnectionProps = {
  connected: boolean;
  canUnlink: boolean;
  googleId: string | null;
};

export default function GoogleConnection({
  connected,
  canUnlink,
}: GoogleConnectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleUnlink = () => {
    setError(null);
    startTransition(async () => {
      const result = await unlinkGoogleAccount();
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <GoogleIcon />
        </span>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Google
          </p>
          <p className="text-[11px] text-zinc-500">
            {connected
              ? "Sign in with your Google account"
              : "Not connected"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {connected ? (
          <button
            type="button"
            onClick={handleUnlink}
            disabled={pending || !canUnlink}
            title={
              !canUnlink
                ? "Set a password first — otherwise you'll be locked out."
                : undefined
            }
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              signIn("google", {
                callbackUrl: "/my-account/profile?linked=google",
              })
            }
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Connect Google
          </button>
        )}
        {error ? (
          <span className="text-[11px] text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : null}
        {connected && !canUnlink ? (
          <span className="text-[11px] text-zinc-500">
            Set a password before disconnecting.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.95l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
