"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

/**
 * Recovery actions for the workspace 404 page.
 *
 * `not-found.tsx` renders without route params, so the workspace id is
 * recovered from the current path on the client — the segment right after
 * `/workspace/`. Falls back to the workspace picker when it can't be found
 * (e.g. `/workspace` itself 404s).
 */
export default function NotFoundActions() {
  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const wsIndex = segments.indexOf("workspace");
  const workspaceId = wsIndex !== -1 ? segments[wsIndex + 1] : undefined;
  const homeHref = workspaceId ? `/workspace/${workspaceId}` : "/workspace";

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
      <Link
        href={homeHref}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-secondary px-4 py-2 text-[13px] font-medium text-white shadow-sm shadow-primary/30 transition hover:opacity-95"
      >
        <LayoutDashboard className="h-4 w-4" />
        Back to workspace
      </Link>
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:border-primary hover:bg-primary/[0.04] hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
        Go back
      </button>
    </div>
  );
}
