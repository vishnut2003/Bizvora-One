import type { NextRequest } from "next/server";
import { connectDB } from "@/config/db";
import { syncSeatQuantity } from "@/lib/billing/seats";
import Subscription from "@/models/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Hourly reconciliation: re-sync any subscription whose seat count drifted
// from its Razorpay record. Gate with CRON_SECRET so this isn't publicly
// invokable. Vercel Cron passes the secret as the Authorization header or as
// a query string — accept either.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "not_configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const queryToken = request.nextUrl.searchParams.get("secret") ?? "";
  const provided =
    authHeader.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;

  if (provided !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const dirty = await Subscription.find({ seatSyncDirty: true })
    .select("workspace")
    .lean();

  let synced = 0;
  for (const sub of dirty) {
    await syncSeatQuantity(String(sub.workspace));
    synced += 1;
  }

  return Response.json({ ok: true, attempted: synced });
}
