import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "@/lib/notification";

export {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATION_ENTITY_TYPES,
  type NotificationType,
  type NotificationEntityType,
  type NotificationDTO,
} from "@/lib/notification";

const notificationSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    // Who receives the notification.
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Who performed the action that triggered it.
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    entityType: { type: String, enum: NOTIFICATION_ENTITY_TYPES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    // Pre-rendered display strings so the bell needs no extra lookups.
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 280 },
    // In-app href to open the related resource.
    link: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Drives the bell query: a recipient's unread/recent items, newest first.
notificationSchema.index({
  workspace: 1,
  recipient: 1,
  read: 1,
  createdAt: -1,
});

export type INotification = InferSchemaType<typeof notificationSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Notification) {
  mongoose.deleteModel("Notification");
}

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification> | undefined) ??
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
