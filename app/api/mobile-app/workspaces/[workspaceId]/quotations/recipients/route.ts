import { requireMobileWorkspace } from "@/lib/mobile-auth";
import { ok, withMobile } from "@/lib/mobile-api";
import {
  requireQuotationViewer,
  searchRecipients,
} from "../../../../_lib/quotations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workspaceId: string }> };

// Unified customer + lead search for the quotation recipient picker.
export const GET = withMobile(async (req, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const access = await requireMobileWorkspace(req, workspaceId);
  requireQuotationViewer(access);

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await searchRecipients(access, q);

  return ok({ items });
});
