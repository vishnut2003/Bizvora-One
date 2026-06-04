"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Check, Plug, Plus, Trash2, Unplug } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import { AGENT_VOICES } from "@/lib/agent";
import {
  connectVapi,
  disconnectVapi,
  saveAgentProfile,
  type AgentActionState,
} from "../actions";

export type PhoneNumberOption = { id: string; number: string; name: string };

export type AgentFormData = {
  enabled: boolean;
  personaName: string;
  tone: string;
  language: string;
  offering: string;
  valueProp: string;
  bookingRule: string;
  aiDisclosure: boolean;
  voiceKey: string;
  faqs: { question: string; answer: string }[];
  vapiPhoneNumberId: string;
};

const INITIAL: AgentActionState = undefined;
const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";
const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </p>
  );
}

// Connect / disconnect the tenant's Vapi account. Its own forms so they don't
// nest inside the main settings form.
function VapiConnection({
  workspaceId,
  hasApiKey,
  connectionError,
}: {
  workspaceId: string;
  hasApiKey: boolean;
  connectionError: boolean;
}) {
  const [connectState, connectAction, connectPending] = useActionState<
    AgentActionState,
    FormData
  >((prev, formData) => connectVapi(workspaceId, prev, formData), INITIAL);
  const [disconnectPending, startDisconnect] = useTransition();

  if (hasApiKey) {
    return (
      <Card title="Vapi connection">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            Connected to your Vapi account
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disconnectPending}
            className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            onClick={() =>
              startDisconnect(async () => {
                await disconnectVapi(workspaceId);
              })
            }
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
        {connectionError ? (
          <ErrorAlert message="We couldn't reach Vapi with the saved key — it may have been revoked. Disconnect and reconnect with a valid key." />
        ) : null}
      </Card>
    );
  }

  return (
    <Card title="Connect your Vapi account">
      <form action={connectAction} className="space-y-3">
        <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
          Paste a private API key from your Vapi dashboard. We&apos;ll verify it,
          load your phone numbers, and store the key encrypted.
        </p>
        <div>
          <label htmlFor="apiKey" className={labelClass}>
            Vapi API key
          </label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder="vapi_••••••••••••••••"
            className="mt-1.5 font-mono"
          />
        </div>
        <ErrorAlert message={connectState?.formError} />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={connectPending}
          aria-busy={connectPending}
        >
          <Plug className="h-3.5 w-3.5" />
          {connectPending ? "Connecting…" : "Connect Vapi"}
        </Button>
      </form>
    </Card>
  );
}

export default function AgentForm({
  workspaceId,
  data,
  companyName,
  hasApiKey,
  numbers,
  connectionError,
}: {
  workspaceId: string;
  data: AgentFormData;
  companyName: string;
  hasApiKey: boolean;
  numbers: PhoneNumberOption[];
  connectionError: boolean;
}) {
  // Stable ids + controlled inputs so removing a row never leaves stale text in
  // a reused DOM node (the index-key + defaultValue trap).
  type FaqRow = { id: number; question: string; answer: string };
  const [faqs, setFaqs] = useState<FaqRow[]>(() => {
    const init = data.faqs.length ? data.faqs : [{ question: "", answer: "" }];
    return init.map((f, i) => ({ id: i, ...f }));
  });
  const nextFaqId = useRef(faqs.length);

  const [phoneNumberId, setPhoneNumberId] = useState(data.vapiPhoneNumberId);
  // Guard against a stale id (e.g. after disconnect→reconnect to another
  // account): only keep it if it's actually one of the loaded numbers.
  const selectedNumberId = numbers.some((n) => n.id === phoneNumberId)
    ? phoneNumberId
    : "";

  const numberOptions: ComboboxOption[] = numbers.map((n) => ({
    value: n.id,
    label: `${n.number || n.id}${n.name ? ` — ${n.name}` : ""}`,
    keywords: [n.number, n.name].filter(Boolean),
  }));

  const [state, formAction, pending] = useActionState<
    AgentActionState,
    FormData
  >((prev, formData) => saveAgentProfile(workspaceId, prev, formData), INITIAL);

  const addFaq = () =>
    setFaqs((p) => [
      ...p,
      { id: nextFaqId.current++, question: "", answer: "" },
    ]);
  const removeFaq = (id: number) =>
    setFaqs((p) => p.filter((f) => f.id !== id));
  const updateFaq = (id: number, patch: Partial<FaqRow>) =>
    setFaqs((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-6">
      <VapiConnection
        workspaceId={workspaceId}
        hasApiKey={hasApiKey}
        connectionError={connectionError}
      />

      <form action={formAction} className="space-y-6">
        <Card title="Status">
          {hasApiKey ? (
            <div>
              <label htmlFor="vapiPhoneNumberId" className={labelClass}>
                Call from
              </label>
              <input
                type="hidden"
                name="vapiPhoneNumberId"
                value={selectedNumberId}
                readOnly
              />
              <Combobox
                id="vapiPhoneNumberId"
                value={selectedNumberId}
                onChange={(v) => setPhoneNumberId(v)}
                options={numberOptions}
                placeholder="Select a phone number…"
                searchPlaceholder="Search numbers…"
                emptyText="No phone numbers on this account."
                allowClear
                className="mt-1.5"
              />
            </div>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Connect your Vapi account above to choose a calling number and
              enable the agent.
            </p>
          )}

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={data.enabled}
              disabled={!hasApiKey}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary/30 disabled:opacity-40 dark:border-zinc-700"
            />
            <span>
              <span className="block text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                Call new leads automatically
              </span>
              <span className="block text-[12px] text-zinc-500 dark:text-zinc-400">
                When on, every new lead with a valid phone number
                {companyName ? ` for ${companyName}` : ""} gets an outbound AI
                call.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="aiDisclosure"
              defaultChecked={data.aiDisclosure}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-700"
            />
            <span>
              <span className="block text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                Disclose that the caller is an AI
              </span>
              <span className="block text-[12px] text-zinc-500 dark:text-zinc-400">
                Recommended (and legally required in many regions). The agent
                always handles opt-out / do-not-call requests regardless.
              </span>
            </span>
          </label>
        </Card>

        <Card title="Persona & voice">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="personaName" className={labelClass}>
                Agent name
              </label>
              <Input
                id="personaName"
                name="personaName"
                defaultValue={data.personaName}
                placeholder="e.g. Riya"
                maxLength={80}
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="voiceKey" className={labelClass}>
                Voice
              </label>
              <select
                id="voiceKey"
                name="voiceKey"
                defaultValue={data.voiceKey}
                className={inputClass}
              >
                {AGENT_VOICES.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tone" className={labelClass}>
                Tone
              </label>
              <Input
                id="tone"
                name="tone"
                defaultValue={data.tone}
                placeholder="e.g. warm, concise, consultative"
                maxLength={120}
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="language" className={labelClass}>
                Language
              </label>
              <Input
                id="language"
                name="language"
                defaultValue={data.language}
                placeholder="English"
                maxLength={40}
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>

        <Card title="What the agent says">
          <div>
            <label htmlFor="offering" className={labelClass}>
              What you offer
            </label>
            <textarea
              id="offering"
              name="offering"
              defaultValue={data.offering}
              rows={2}
              maxLength={1000}
              placeholder="e.g. We build custom CRM and automation software for SMBs."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="valueProp" className={labelClass}>
              Value proposition
            </label>
            <textarea
              id="valueProp"
              name="valueProp"
              defaultValue={data.valueProp}
              rows={2}
              maxLength={1000}
              placeholder="Why a lead should care / what problem you solve."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bookingRule" className={labelClass}>
              Goal / next step
            </label>
            <textarea
              id="bookingRule"
              name="bookingRule"
              defaultValue={data.bookingRule}
              rows={2}
              maxLength={1000}
              placeholder="e.g. Qualify interest and book a 15-min demo with the sales team."
              className={inputClass}
            />
          </div>
        </Card>

        <Card title="FAQs the agent can answer">
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div
                key={f.id}
                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    FAQ {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFaq(f.id)}
                    aria-label="Remove FAQ"
                    className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  name="faqQuestion"
                  value={f.question}
                  onChange={(e) => updateFaq(f.id, { question: e.target.value })}
                  placeholder="Question"
                  maxLength={300}
                  className="mt-2"
                />
                <textarea
                  name="faqAnswer"
                  value={f.answer}
                  onChange={(e) => updateFaq(f.id, { answer: e.target.value })}
                  rows={2}
                  maxLength={1000}
                  placeholder="Answer"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add FAQ
          </button>
        </Card>

        {state?.formError ? <ErrorAlert message={state.formError} /> : null}

        <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_18px_38px_-18px_rgba(24,24,27,0.22)] dark:border-zinc-800 dark:bg-zinc-900">
          {state?.ok ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Saved
            </span>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Saving…" : "Save agent settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
