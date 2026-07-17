import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched URLs under `/workspace/[workspaceId]`.
 *
 * A nested `not-found.tsx` only renders for explicit `notFound()` calls — it
 * does NOT catch URLs that match no route (e.g. `/workspace/{id}/home`). Those
 * would otherwise fall through to Next's bare global 404. This route matches
 * any leftover path (defined routes take precedence) and hands it to the
 * workspace not-found boundary so the branded 404 shows instead.
 */
export default function WorkspaceCatchAll() {
  notFound();
}
