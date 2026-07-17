import type { Metadata } from "next";
import { Compass } from "lucide-react";
import NotFoundActions from "./_components/not-found-actions";

export const metadata: Metadata = {
  title: "Page not found — BizvoraOne",
};

/**
 * 404 boundary for everything under `/workspace/[workspaceId]`.
 *
 * Renders whenever a workspace route calls `notFound()` (invalid record id,
 * failed access check, …) or when a URL under the workspace matches no route.
 * It sits above the root layout only — there's no `[workspaceId]/layout.tsx` —
 * so it presents as a self-contained, full-screen page rather than inside the
 * dashboard chrome.
 */
export default function WorkspaceNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* Ambient gradient wash + blurred blobs — mirrors the workspace hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-white to-secondary/[0.06] dark:from-primary/[0.18] dark:via-zinc-900 dark:to-secondary/[0.14]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 opacity-50 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/15 opacity-40 blur-3xl"
        />

        <div className="relative px-6 py-12 text-center sm:px-10">
          <span className="relative mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
            />
            <Compass className="relative h-6 w-6" />
          </span>

          <p className="mt-6 bg-gradient-to-br from-primary to-secondary bg-clip-text text-[64px] font-semibold leading-none tracking-tight tabular-nums text-transparent">
            404
          </p>

          <h1 className="mt-4 text-[22px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            This page wandered off
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            The page you&apos;re looking for doesn&apos;t exist in this
            workspace, or it may have been moved or deleted.
          </p>

          <NotFoundActions />
        </div>
      </div>
    </div>
  );
}
