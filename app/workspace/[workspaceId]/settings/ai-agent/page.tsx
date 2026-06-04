import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import { connectDB } from "@/config/db";
import AgentProfile from "@/models/agent-profile";
import Company from "@/models/company";
import { INTEGRATION_MANAGER_ROLES, decryptSecret } from "@/lib/integration";
import { listPhoneNumbers, type VapiPhoneNumber } from "@/lib/vapi";
import { voiceKeyOf, DEFAULT_VOICE_KEY } from "@/lib/agent";
import type { WorkspaceColor } from "@/lib/workspace";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import DashboardLayout from "@/layouts/dashboard-layout";
import AgentForm, { type AgentFormData } from "./_components/agent-form";

export const metadata: Metadata = {
  title: "AI Agent — BizvoraOne",
};

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export default async function AiAgentPage({ params }: Props) {
  const { workspaceId } = await params;

  const {
    session,
    workspace: doc,
    role: myRole,
  } = await requireWorkspaceAccess({
    workspaceId,
    allowedRoles: INTEGRATION_MANAGER_ROLES,
  });

  await connectDB();
  const [profile, company] = await Promise.all([
    AgentProfile.findOne({ workspace: workspaceId }).lean(),
    Company.findOne({ workspace: workspaceId }).lean(),
  ]);

  // If the tenant has connected Vapi, fetch their phone numbers server-side for
  // the picker. Never send the key (or its ciphertext) to the client.
  const hasApiKey = Boolean(profile?.vapiApiKey);
  let numbers: VapiPhoneNumber[] = [];
  let connectionError = false;
  if (hasApiKey) {
    try {
      numbers = await listPhoneNumbers(decryptSecret(profile!.vapiApiKey));
    } catch (err) {
      console.error("[ai-agent] failed to list Vapi numbers", err);
      connectionError = true;
    }
  }

  const data: AgentFormData = {
    enabled: profile?.enabled ?? false,
    personaName: profile?.personaName ?? "",
    tone: profile?.tone ?? "",
    language: profile?.language ?? "English",
    offering: profile?.offering ?? "",
    valueProp: profile?.valueProp ?? "",
    bookingRule: profile?.bookingRule ?? "",
    aiDisclosure: profile?.aiDisclosure ?? true,
    voiceKey: profile?.voice
      ? voiceKeyOf(profile.voice)
      : DEFAULT_VOICE_KEY,
    faqs: (profile?.faqs ?? []).map((f) => ({
      question: f.question ?? "",
      answer: f.answer ?? "",
    })),
    vapiPhoneNumberId: profile?.vapiPhoneNumberId ?? "",
  };

  const companyName = company?.displayName || company?.legalName || "";

  const workspace = {
    id: String(doc._id),
    name: doc.name,
    color: doc.color as WorkspaceColor,
    role: myRole,
  };

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      workspace={workspace}
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.05] dark:from-primary/[0.14] dark:via-zinc-900 dark:to-secondary/[0.10]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-secondary/15 opacity-40 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start gap-3.5 p-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
              <PhoneCall className="relative h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                Workspace Settings
              </p>
              <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                AI calling agent
              </h1>
              <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                When enabled, a voice agent calls each new lead automatically —
                speaking as{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {companyName || workspace.name}
                </span>
                . Identity comes from your Company Details; persona and script
                are set below.
              </p>
            </div>
          </div>
        </div>

        <AgentForm
          workspaceId={workspace.id}
          data={data}
          companyName={companyName}
          hasApiKey={hasApiKey}
          numbers={numbers}
          connectionError={connectionError}
        />
      </div>
    </DashboardLayout>
  );
}
