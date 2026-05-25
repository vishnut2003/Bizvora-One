import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/task";

export {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_DOT_CLASS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE_CLASS,
  TASK_PRIORITY_DOT_CLASS,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/task";

const taskSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    status: {
      type: String,
      enum: TASK_STATUSES,
      required: true,
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      required: true,
      default: "medium",
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    dueDate: { type: Date, default: null },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, milestone: 1 });

export type ITask = InferSchemaType<typeof taskSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Task) {
  mongoose.deleteModel("Task");
}

const Task: Model<ITask> =
  (mongoose.models.Task as Model<ITask> | undefined) ??
  mongoose.model<ITask>("Task", taskSchema);

export default Task;
