import "server-only";
import { MILESTONE_STATUSES, type MilestoneStatus } from "@/lib/milestone";

export type MilestoneBodyInput = {
  title: string;
  description: string;
  dueDate: Date | null;
  status: MilestoneStatus;
};

// Mirrors parseForm from the milestones server actions.
export function parseMilestoneBody(body: Record<string, unknown>): {
  data?: MilestoneBodyInput;
  errors?: Record<string, string>;
} {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const statusRaw = typeof body.status === "string" ? body.status : "open";

  let dueDate: Date | null = null;
  if (typeof body.dueDate === "string" && body.dueDate) {
    const d = new Date(body.dueDate);
    dueDate = Number.isNaN(d.getTime()) ? null : d;
  }

  const errors: Record<string, string> = {};
  if (!title) errors.title = "Title is required.";
  else if (title.length > 200) errors.title = "Title is too long (max 200).";
  if (!(MILESTONE_STATUSES as readonly string[]).includes(statusRaw))
    errors.status = "Pick a status.";

  if (Object.keys(errors).length > 0) return { errors };
  return {
    data: {
      title,
      description: description.slice(0, 4000),
      dueDate,
      status: statusRaw as MilestoneStatus,
    },
  };
}
