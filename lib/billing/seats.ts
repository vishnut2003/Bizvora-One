import "server-only";
import { connectDB } from "@/config/db";
import { updateRazorpaySubscriptionQuantity } from "@/lib/razorpay";
import Workspace from "@/models/workspace";
import Subscription from "@/models/subscription";

// Best-effort sync of the workspace's member count onto its Razorpay
// subscription. Never throws — failures set seatSyncDirty so the hourly cron
// can replay them. Razorpay does not prorate quantity changes; the new seat
// count takes effect on the next invoice (we surface this in the UI).
export async function syncSeatQuantity(workspaceId: string): Promise<void> {
  try {
    await connectDB();
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return;

    const sub = await Subscription.findOne({ workspace: workspaceId });
    if (!sub) return; // Comped workspaces have no subscription.

    if (
      sub.status !== "active" &&
      sub.status !== "authenticated" &&
      sub.status !== "pending"
    ) {
      return;
    }

    const desired = Math.max(1, workspace.members?.length ?? 1);
    if (desired === sub.quantity) {
      // Already in sync — clear the dirty flag if it was set.
      if (sub.seatSyncDirty) {
        sub.seatSyncDirty = false;
        await sub.save();
      }
      return;
    }

    try {
      await updateRazorpaySubscriptionQuantity(
        sub.razorpaySubscriptionId,
        desired,
      );
      sub.quantity = desired;
      sub.seatSyncDirty = false;
      await sub.save();
    } catch (err) {
      console.error(
        `[seats] Razorpay quantity update failed for ${sub.razorpaySubscriptionId}:`,
        err,
      );
      sub.seatSyncDirty = true;
      await sub.save();
    }
  } catch (err) {
    // Final safety net — never let a billing-side hiccup break the caller.
    console.error("[seats] syncSeatQuantity unexpected failure:", err);
  }
}
