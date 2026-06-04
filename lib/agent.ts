// Browser-safe AI voice-agent constants. No Node/Mongoose imports here so both
// the settings form (client) and the server-only lib/vapi.ts can share it.

export type AgentVoice = {
  key: string;
  label: string;
  // Vapi voice provider + id. The platform Vapi account must have the provider
  // enabled. "vapi" native voices need no extra provider keys.
  provider: string;
  voiceId: string;
};

// Curated voices the tenant can pick from. Keeping this a fixed list (rather
// than free text) ensures the stored voice is always valid for our account.
export const AGENT_VOICES: AgentVoice[] = [
  { key: "elliot", label: "Elliot — warm, neutral", provider: "vapi", voiceId: "Elliot" },
  { key: "kylie", label: "Kylie — friendly, upbeat", provider: "vapi", voiceId: "Kylie" },
  { key: "rohan", label: "Rohan — calm, professional", provider: "vapi", voiceId: "Rohan" },
  { key: "neha", label: "Neha — clear, energetic", provider: "vapi", voiceId: "Neha" },
  { key: "cole", label: "Cole — confident, deep", provider: "vapi", voiceId: "Cole" },
  { key: "hana", label: "Hana — soft, reassuring", provider: "vapi", voiceId: "Hana" },
];

export const DEFAULT_VOICE_KEY = "elliot";

export function voiceByKey(key: string): AgentVoice {
  return AGENT_VOICES.find((v) => v.key === key) ?? AGENT_VOICES[0];
}

// Map a stored { provider, voiceId } back to its catalog key for the form.
export function voiceKeyOf(voice: {
  provider?: string;
  voiceId?: string;
}): string {
  const match = AGENT_VOICES.find(
    (v) => v.provider === voice.provider && v.voiceId === voice.voiceId,
  );
  return match?.key ?? DEFAULT_VOICE_KEY;
}
