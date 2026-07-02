import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { INTEGRATION_PROVIDERS } from "@/lib/integration";
import { LEAD_PRIORITIES } from "@/lib/lead";

export { INTEGRATION_PROVIDERS, type IntegrationProvider } from "@/lib/integration";

export const INTEGRATION_STATUSES = ["active", "paused"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

const oauthSchema = new Schema(
  {
    accountEmail: { type: String, default: null },
    // AES-256-GCM ciphertext (base64). Never log this value.
    refreshToken: { type: String, default: null },
    accessToken: { type: String, default: null },
    accessTokenExpiresAt: { type: Date, default: null },
    scopes: { type: [String], default: [] },
  },
  { _id: false },
);

// A Facebook Page the user manages, returned by /me/accounts and held until
// they pick one. accessToken is AES-256-GCM ciphertext — never send to client.
const metaPendingPageSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: "" },
    accessToken: { type: String, default: null },
  },
  { _id: false },
);

// Meta Ads (Facebook Lead Ads) connector state. Multi-tenant: each workspace
// brings its own Meta developer app, so the app credentials live here (the
// integration's webhookKey doubles as the webhook verify token).
const metaSchema = new Schema(
  {
    appId: { type: String, default: null },
    // AES-256-GCM ciphertext (base64). Never log this value.
    appSecret: { type: String, default: null },
    pageId: { type: String, default: null },
    pageName: { type: String, default: null },
    // AES-256-GCM ciphertext (base64). Never log this value.
    pageAccessToken: { type: String, default: null },
    tokenStatus: { type: String, enum: ["valid", "invalid"], default: "valid" },
    pendingPages: { type: [metaPendingPageSchema], default: [] },
  },
  { _id: false },
);

const defaultsSchema = new Schema(
  {
    priority: {
      type: String,
      enum: LEAD_PRIORITIES,
      default: "medium",
    },
    tags: { type: [String], default: [] },
  },
  { _id: false },
);

const integrationSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: INTEGRATION_PROVIDERS,
      required: true,
    },
    webhookKey: { type: String, required: true },
    oauth: { type: oauthSchema, default: () => ({}) },
    meta: { type: metaSchema, default: null },
    campaigns: { type: Map, of: String, default: () => new Map() },
    forms: { type: Map, of: String, default: () => new Map() },
    defaults: { type: defaultsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: INTEGRATION_STATUSES,
      required: true,
      default: "active",
    },
    connectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastEventAt: { type: Date, default: null },
    totalLeadsReceived: { type: Number, default: 0 },
  },
  { timestamps: true },
);

integrationSchema.index({ workspace: 1, provider: 1 }, { unique: true });
// Routes app-level Meta webhooks to a workspace by page ID, and blocks the
// same Facebook Page from being connected to two workspaces at once.
integrationSchema.index(
  { provider: 1, "meta.pageId": 1 },
  {
    unique: true,
    partialFilterExpression: { "meta.pageId": { $type: "string" } },
  },
);

export type IIntegration = InferSchemaType<typeof integrationSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.Integration) {
  mongoose.deleteModel("Integration");
}

const Integration: Model<IIntegration> =
  (mongoose.models.Integration as Model<IIntegration> | undefined) ??
  mongoose.model<IIntegration>("Integration", integrationSchema);

export default Integration;
