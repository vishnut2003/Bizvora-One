import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PROPOSAL_CHAT_ROLES = ["user", "assistant"] as const;
export type ProposalChatRole = (typeof PROPOSAL_CHAT_ROLES)[number];

/**
 * Proposal data emitted by the assistant when it generates a PDF.
 * Kept as Mixed so we can evolve the shape (versioned via `version`) without
 * a migration every time. Persisted alongside the assistant message so a chat
 * can re-render the same PDF later, even though the rendered file itself is
 * never stored here.
 */
const proposalDataSchema = new Schema(
  {
    version: { type: Number, default: 1 },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

/**
 * Future-proof attachment slot. Today it's always empty — when we wire up
 * Vercel Blob storage we'll push entries like
 *   { kind: "pdf", provider: "vercel-blob", url, filename, sizeBytes }
 * here so the chat history can deep-link to the rendered PDF.
 */
const attachmentSchema = new Schema(
  {
    kind: { type: String, required: true, trim: true, maxlength: 32 },
    provider: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    filename: { type: String, trim: true, default: "" },
    sizeBytes: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    role: { type: String, enum: PROPOSAL_CHAT_ROLES, required: true },
    content: { type: String, required: true, default: "" },
    proposal: { type: proposalDataSchema, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: true },
);

const proposalChatSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: "New proposal",
    },
    messages: { type: [messageSchema], default: [] },
    lastMessagePreview: {
      type: String,
      trim: true,
      default: "",
      maxlength: 240,
    },
  },
  { timestamps: true },
);

proposalChatSchema.index({ workspace: 1, updatedAt: -1 });
proposalChatSchema.index({ workspace: 1, createdBy: 1, updatedAt: -1 });

export type IProposalChat = InferSchemaType<typeof proposalChatSchema>;
export type IProposalChatMessage = IProposalChat["messages"][number];

if (process.env.NODE_ENV !== "production" && mongoose.models.ProposalChat) {
  mongoose.deleteModel("ProposalChat");
}

const ProposalChat: Model<IProposalChat> =
  (mongoose.models.ProposalChat as Model<IProposalChat> | undefined) ??
  mongoose.model<IProposalChat>("ProposalChat", proposalChatSchema);

export default ProposalChat;
