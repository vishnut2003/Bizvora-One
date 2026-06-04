"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/config/auth";
import { connectDB } from "@/config/db";
import AgentProfile from "@/models/agent-profile";
import Workspace from "@/models/workspace";
import {
  canManageIntegrations,
  encryptSecret,
} from "@/lib/integration";
import { getActorRole } from "@/lib/workspace-access";
import { voiceByKey } from "@/lib/agent";
import { listPhoneNumbers } from "@/lib/vapi";

export type AgentActionState = { ok?: boolean; formError?: string } | undefined;

async function authorize(
  workspaceId: string,
): Promise<{ userId: string } | { formError: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { formError: "Your session expired. Please sign in again." };
  }
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return { formError: "Invalid workspace." };
  }
  await connectDB();
  const workspace = await Workspace.findById(workspaceId).select(
    "owner members",
  );
  if (!workspace) return { formError: "Workspace not found." };
  const role = getActorRole(workspace, session.user.id);
  if (!canManageIntegrations(role)) {
    return { formError: "You don't have permission to manage the AI agent." };
  }
  return { userId: session.user.id };
}

function str(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "")
    .trim()
    .slice(0, max);
}

export async function saveAgentProfile(
  workspaceId: string,
  _prev: AgentActionState,
  formData: FormData,
): Promise<AgentActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const enabled = formData.get("enabled") === "on";
  const aiDisclosure = formData.get("aiDisclosure") === "on";
  const voice = voiceByKey(String(formData.get("voiceKey") ?? ""));
  const vapiPhoneNumberId = String(formData.get("vapiPhoneNumberId") ?? "").trim();

  // FAQs arrive as parallel question[]/answer[] fields; keep only complete pairs.
  const questions = formData.getAll("faqQuestion").map((v) => String(v).trim());
  const answers = formData.getAll("faqAnswer").map((v) => String(v).trim());
  const faqs = questions
    .map((question, i) => ({ question, answer: (answers[i] ?? "").trim() }))
    .filter((f) => f.question && f.answer)
    .slice(0, 20)
    .map((f) => ({
      question: f.question.slice(0, 300),
      answer: f.answer.slice(0, 1000),
    }));

  if (enabled) {
    if (!str(formData, "personaName", 80)) {
      return { formError: "Add a persona name before enabling the agent." };
    }
    if (!str(formData, "offering", 1000)) {
      return { formError: "Describe what you offer before enabling the agent." };
    }
    const existing = await AgentProfile.findOne({ workspace: workspaceId })
      .select("vapiApiKey")
      .lean();
    if (!existing?.vapiApiKey) {
      return { formError: "Connect your Vapi account before enabling the agent." };
    }
    if (!vapiPhoneNumberId) {
      return { formError: "Choose a phone number before enabling the agent." };
    }
  }

  try {
    await AgentProfile.findOneAndUpdate(
      { workspace: workspaceId },
      {
        $set: {
          enabled,
          personaName: str(formData, "personaName", 80),
          tone: str(formData, "tone", 120),
          language: str(formData, "language", 40) || "English",
          offering: str(formData, "offering", 1000),
          valueProp: str(formData, "valueProp", 1000),
          bookingRule: str(formData, "bookingRule", 1000),
          aiDisclosure,
          faqs,
          voice: { provider: voice.provider, voiceId: voice.voiceId },
          vapiPhoneNumberId,
          updatedBy: guard.userId,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error("[saveAgentProfile] failed", err);
    return { formError: "Couldn't save the agent settings. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/ai-agent`);
  return { ok: true };
}

// Connect the tenant's own Vapi account: validate the API key by listing their
// phone numbers, then store it encrypted. The raw key is never persisted or
// returned to the client.
export async function connectVapi(
  workspaceId: string,
  _prev: AgentActionState,
  formData: FormData,
): Promise<AgentActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) {
    return { formError: "Paste your Vapi API key to connect." };
  }

  try {
    await listPhoneNumbers(apiKey); // validates the key (throws if invalid)
  } catch (err) {
    console.error("[connectVapi] validation failed", err);
    return {
      formError:
        "That API key didn't work. Use a private key from your Vapi dashboard and try again.",
    };
  }

  try {
    await AgentProfile.findOneAndUpdate(
      { workspace: workspaceId },
      {
        $set: {
          vapiApiKey: encryptSecret(apiKey),
          vapiPhoneNumberId: "", // clear any stale selection from a prior key
          updatedBy: guard.userId,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error("[connectVapi] save failed", err);
    return { formError: "Couldn't save the connection. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/ai-agent`);
  return { ok: true };
}

// Disconnect: clear the stored key + number and turn the agent off.
export async function disconnectVapi(
  workspaceId: string,
): Promise<AgentActionState> {
  const guard = await authorize(workspaceId);
  if ("formError" in guard) return guard;

  await AgentProfile.updateOne(
    { workspace: workspaceId },
    {
      $set: {
        vapiApiKey: "",
        vapiPhoneNumberId: "",
        enabled: false,
        updatedBy: guard.userId,
      },
    },
  );

  revalidatePath(`/workspace/${workspaceId}/settings/ai-agent`);
  return { ok: true };
}
