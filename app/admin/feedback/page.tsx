import { MessageSquare } from "lucide-react";
import { connectDB } from "@/config/db";
import Feedback from "@/models/feedback";
import Workspace from "@/models/workspace";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  type FeedbackCategory,
  type FeedbackDTO,
  type FeedbackStatus,
} from "@/lib/feedback";
import FeedbackList from "./_components/feedback-list";

async function getFeedback(): Promise<FeedbackDTO[]> {
  await connectDB();

  const docs = await Feedback.find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // Resolve workspace names in one pass.
  const workspaceIds = [...new Set(docs.map((d) => String(d.workspace)))];
  const workspaces = await Workspace.find(
    { _id: { $in: workspaceIds } },
    "name",
  ).lean();
  const names = new Map(workspaces.map((w) => [String(w._id), w.name]));

  return docs.map((d) => ({
    id: String(d._id),
    category: d.category as FeedbackCategory,
    message: d.message,
    status: d.status as FeedbackStatus,
    authorName: d.authorName ?? "",
    authorEmail: d.authorEmail ?? "",
    workspaceName: names.get(String(d.workspace)) ?? "—",
    createdAt: new Date(d.createdAt as Date).toISOString(),
  }));
}

export default async function AdminFeedbackPage() {
  await requirePlatformAdmin();
  const feedback = await getFeedback();
  const newCount = feedback.filter((f) => f.status === "new").length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            Platform admin
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
            Feedback
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {feedback.length} total
            {newCount > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-primary">{newCount} new</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <FeedbackList feedback={feedback} />
    </div>
  );
}
