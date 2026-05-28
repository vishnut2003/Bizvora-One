import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const webhookEventSchema = new Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    receivedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export type IWebhookEvent = InferSchemaType<typeof webhookEventSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.WebhookEvent) {
  mongoose.deleteModel("WebhookEvent");
}

const WebhookEvent: Model<IWebhookEvent> =
  (mongoose.models.WebhookEvent as Model<IWebhookEvent> | undefined) ??
  mongoose.model<IWebhookEvent>("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
