// Single source of truth for the docs section.
//
// Both the `/docs` landing page (grid of categories) and each category index
// page (grid of docs) render by mapping over this registry. Growing the docs
// section is a registry edit, not new layout code:
//   - Add a doc to a category  -> push a DocLink onto that category's `docs`
//                                 and create the article page.
//   - Add a whole new category -> push a DocCategory here and create one
//                                 `app/(resourses)/docs/<id>/page.tsx`.

import type { ReactNode } from "react";
import { PlugZap } from "lucide-react";
import { BRAND } from "@/content/legal/_shared";

export type DocLink = {
  /** URL-safe slug, unique within its category. */
  slug: string;
  /** Card title, e.g. "Connect Meta Ads". */
  title: string;
  /** One-line summary shown on the card. */
  description: string;
  /** Absolute path to the article, e.g. "/docs/integrations/...". */
  href: string;
  /** ISO date the doc was last revised, e.g. "2026-07-02". */
  updated?: string;
  /** Optional pill on the card, e.g. "New". */
  badge?: string;
};

export type DocCategory = {
  /** URL segment, e.g. "integrations". */
  id: string;
  /** Category title shown on `/docs` and the category page. */
  title: string;
  /** One-line summary of the category. */
  description: string;
  /** Absolute path to the category index, i.e. `/docs/${id}`. */
  href: string;
  /** Icon rendered in the card's chip (lucide node). */
  icon: ReactNode;
  /** Docs belonging to this category. */
  docs: DocLink[];
};

export const docsCategories: DocCategory[] = [
  {
    id: "integrations",
    title: "Integrations",
    description: `Connect ${BRAND} with the tools you already use, so leads and data flow in automatically.`,
    href: "/docs/integrations",
    icon: <PlugZap className="h-5 w-5" />,
    docs: [
      {
        slug: "how-to-connect-meta-ads-with-bizvora",
        title: "Connect Meta Ads",
        description: `Bring Facebook & Instagram Lead Ads into ${BRAND} automatically — every form submission becomes a lead within seconds.`,
        href: "/docs/integrations/how-to-connect-meta-ads-with-bizvora",
        updated: "2026-07-02",
      },
    ],
  },
];

/** Look up a category by its URL segment. */
export function getCategory(id: string): DocCategory | undefined {
  return docsCategories.find((category) => category.id === id);
}
