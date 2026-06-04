import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Per-workspace (per-tenant) outbound AI voice-agent configuration. One doc per
// workspace. The content fields are tenant-editable; the structural prompt and
// compliance lines are assembled server-side in lib/vapi.ts and are NOT stored
// here, so a tenant can't remove the AI disclosure or do-not-call handling.

const faqSchema = new Schema(
  {
    question: { type: String, trim: true, maxlength: 300, default: "" },
    answer: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { _id: true },
);

const voiceSchema = new Schema(
  {
    provider: { type: String, trim: true, default: "" },
    voiceId: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const agentProfileSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },
    // Master switch — no calls are placed unless this is true.
    enabled: { type: Boolean, default: false },

    // Per-tenant Vapi connection. The API key is stored ENCRYPTED (ciphertext
    // from lib/integration.ts encryptSecret) and only decrypted server-side at
    // call time; never exposed to the client. The phone number id is not secret.
    vapiApiKey: { type: String, default: "" },
    vapiPhoneNumberId: { type: String, default: "" },

    // Tenant-editable identity / content.
    personaName: { type: String, trim: true, maxlength: 80, default: "" },
    tone: { type: String, trim: true, maxlength: 120, default: "" },
    language: { type: String, trim: true, maxlength: 40, default: "English" },
    offering: { type: String, trim: true, maxlength: 1000, default: "" },
    valueProp: { type: String, trim: true, maxlength: 1000, default: "" },
    faqs: { type: [faqSchema], default: [] },
    bookingRule: { type: String, trim: true, maxlength: 1000, default: "" },
    // Whether the agent must disclose it's an AI at the start of the call.
    aiDisclosure: { type: Boolean, default: true },
    voice: { type: voiceSchema, default: () => ({}) },

    // Ops / stats.
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalCallsTriggered: { type: Number, default: 0 },
    lastCallAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type IAgentProfile = InferSchemaType<typeof agentProfileSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.AgentProfile) {
  mongoose.deleteModel("AgentProfile");
}

const AgentProfile: Model<IAgentProfile> =
  (mongoose.models.AgentProfile as Model<IAgentProfile> | undefined) ??
  mongoose.model<IAgentProfile>("AgentProfile", agentProfileSchema);

export default AgentProfile;
