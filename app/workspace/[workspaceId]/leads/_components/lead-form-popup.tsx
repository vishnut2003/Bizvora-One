"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Loader2,
  MessageSquare,
  Pencil,
  Sparkles,
  Tag as TagIcon,
  TrendingUp,
  UserCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/button";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import DatePicker from "@/components/date-picker";
import Input from "@/components/input";
import PhoneInput from "@/components/phone-input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { COUNTRIES } from "@/lib/countries";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_BADGE_CLASS,
  LEAD_PRIORITY_LABEL,
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  LEAD_STAGES,
  LEAD_STAGE_BADGE_CLASS,
  LEAD_STAGE_LABEL,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
} from "@/lib/lead";
import type { UserRole } from "@/lib/user";
import type { LeadActionState } from "../actions";

// The follow-up field is a date-only value carried through the form as a
// timezone-free `yyyy-MM-dd` string. These two helpers convert to/from a
// local-midnight Date so the calendar highlights and reports the exact day
// the user clicks, regardless of browser or server timezone.
function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const STAGE_DOT_CLASS: Record<LeadStage, string> = {
  new: "bg-sky-500",
  attempting_contact: "bg-cyan-500",
  contacted: "bg-indigo-500",
  qualified: "bg-violet-500",
  proposal_sent: "bg-blue-500",
  negotiation: "bg-amber-500",
  won: "bg-emerald-500",
  lost: "bg-rose-500",
  follow_up: "bg-fuchsia-500",
};

export type LeadFormMember = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type LeadFormNote = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export type LeadFormDefaults = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  city: string;
  state: string;
  country: string;
  stage: LeadStage;
  source: LeadSource;
  priority: LeadPriority;
  estimatedValue: string;
  assignedTo: string;
  tags: string;
  nextFollowUpAt: string;
  lostReason: string;
};

export const EMPTY_LEAD_DEFAULTS: LeadFormDefaults = {
  name: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  website: "",
  city: "",
  state: "",
  country: "",
  stage: "new",
  source: "website",
  priority: "medium",
  estimatedValue: "",
  assignedTo: "",
  tags: "",
  nextFollowUpAt: "",
  lostReason: "",
};

const labelClass =
  "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

export type LeadNoteDraftInput = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  stage?: string;
  source?: string;
  priority?: string;
  tags?: string[];
  existingNotes?: string[];
  seed?: string;
};

export type GenerateNoteResult =
  | { ok: true; note: string }
  | { ok: false; error: string };

type LeadFormPopupProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  mode: "create" | "edit";
  defaults: LeadFormDefaults;
  members: LeadFormMember[];
  currentUserId: string;
  actorRole: UserRole;
  notes?: LeadFormNote[];
  onSubmit: (
    formData: FormData,
    state: LeadActionState,
  ) => Promise<LeadActionState>;
  /** Draft the note with Claude. Bound to the workspace by the parent. */
  onGenerateNote?: (input: LeadNoteDraftInput) => Promise<GenerateNoteResult>;
};

export default function LeadFormPopup({
  open,
  onOpenChange,
  mode,
  defaults,
  members,
  currentUserId,
  actorRole,
  notes,
  onSubmit,
  onGenerateNote,
}: LeadFormPopupProps) {
  const [values, setValues] = useState<LeadFormDefaults>(defaults);
  const [noteBody, setNoteBody] = useState("");
  const [state, setState] = useState<LeadActionState>(undefined);
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const memberOptions = useMemo(() => {
    const isExec = actorRole === "sales_executive";
    if (isExec) {
      const me = members.find((m) => m.id === currentUserId);
      return me ? [me] : [];
    }
    return members;
  }, [members, actorRole, currentUserId]);

  const assigneeOptions = useMemo<ComboboxOption<string>[]>(
    () =>
      memberOptions.map((m) => ({
        value: m.id,
        label: m.name,
        keywords: [m.email],
        renderItem: (
          <AssigneeRow
            name={m.name}
            email={m.email}
            image={m.image ?? null}
            isYou={m.id === currentUserId}
          />
        ),
        renderTrigger: (
          <AssigneeRow
            name={m.name}
            email={m.email}
            image={m.image ?? null}
            isYou={m.id === currentUserId}
            compact
          />
        ),
      })),
    [memberOptions, currentUserId],
  );

  const countryOptions = useMemo<ComboboxOption<string>[]>(
    () =>
      COUNTRIES.map((c) => ({
        value: c.name,
        label: c.name,
        keywords: [c.code],
      })),
    [],
  );

  const set = <K extends keyof LeadFormDefaults>(
    k: K,
    v: LeadFormDefaults[K],
  ) => setValues((prev) => ({ ...prev, [k]: v }));

  // Re-seed from the latest `defaults` whenever the popup transitions from
  // closed to open. useState's initial value only runs on mount, so without
  // this each reopen would show whatever state the user left behind after the
  // previous edit instead of the freshly revalidated lead data.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setValues(defaults);
      setNoteBody("");
      setState(undefined);
      setAiError(null);
      formRef.current?.reset();
    }
    prevOpenRef.current = open;
  }, [open, defaults]);

  const handleOpenChange = (next: boolean) => {
    if (!next) formRef.current?.reset();
    onOpenChange(next);
  };

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await onSubmit(formData, state);
      if (result?.ok) {
        handleOpenChange(false);
      } else {
        setState(result);
      }
    });
  };

  const errs = state?.errors;
  const errClass = (key: keyof NonNullable<typeof errs>) =>
    errs?.[key]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "";

  const title = mode === "create" ? "Add a lead" : "Edit lead";
  const desc =
    mode === "create"
      ? "Capture a new lead or prospect. Stage, source and priority help you route follow-ups."
      : "Update details, log a note, or move the lead through the pipeline.";
  const submitLabel = mode === "create" ? "Add lead" : "Save changes";
  const submittingLabel = mode === "create" ? "Adding…" : "Saving…";

  const initial = (values.name || "?").trim().charAt(0).toUpperCase() || "?";
  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          values.tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0),
        ),
      ).slice(0, 20),
    [values.tags],
  );

  const removeTag = (tag: string) => {
    set(
      "tags",
      parsedTags.filter((t) => t !== tag).join(", "),
    );
  };

  const handleGenerateNote = async () => {
    if (!onGenerateNote || generating) return;
    setGenerating(true);
    setAiError(null);
    try {
      const result = await onGenerateNote({
        name: values.name,
        company: values.company,
        email: values.email,
        phone: values.phone,
        stage: values.stage,
        source: values.source,
        priority: values.priority,
        tags: parsedTags,
        existingNotes: (notes ?? []).map(
          (n) => `${n.createdAt} — ${n.authorName}: ${n.body}`,
        ),
        seed: noteBody,
      });
      if (result.ok) {
        setNoteBody(result.note);
      } else {
        setAiError(result.error);
      }
    } catch {
      setAiError("Couldn't generate a note. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Popup
      open={open}
      onOpenChange={handleOpenChange}
      className="max-h-[92vh] overflow-hidden sm:max-w-2xl"
    >
      <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-white to-secondary/[0.06] dark:from-primary/[0.16] dark:via-zinc-900 dark:to-secondary/[0.12]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/10 opacity-40 blur-3xl"
        />
        <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-[16px] font-semibold text-white shadow-md shadow-primary/30">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
            />
            <span className="relative">
              {mode === "create" ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                initial
              )}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                {title}
              </DialogTitle>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  LEAD_STAGE_BADGE_CLASS[values.stage],
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    STAGE_DOT_CLASS[values.stage],
                  )}
                />
                {LEAD_STAGE_LABEL[values.stage]}
              </span>
            </div>
            <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {desc}
            </DialogDescription>
          </div>
          {mode === "edit" ? (
            <span className="hidden shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-[10.5px] font-medium text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-400">
              <Pencil className="h-3 w-3" />
              Editing
            </span>
          ) : null}
        </div>
      </div>

      <form
        ref={formRef}
        action={handleAction}
        className="max-h-[calc(92vh-12rem)] overflow-y-auto px-6 pb-6 pt-5"
      >
        <div className="space-y-5">
          <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <SectionHeader
              icon={UserCircle2}
              title="Contact"
              subtitle="Who they are and where to reach them"
              accent="from-blue-500 to-indigo-600"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="lead-name" className={labelClass}>
                  Full name *
                </label>
                <Input
                  id="lead-name"
                  name="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Jane Doe"
                  required
                  autoComplete="off"
                  className={cn("mt-2", errClass("name"))}
                />
                {errs?.name ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.name}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="lead-email" className={labelClass}>
                  Email
                </label>
                <Input
                  id="lead-email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="off"
                  className={cn("mt-2", errClass("email"))}
                />
                {errs?.email ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.email}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="lead-phone" className={labelClass}>
                  Phone
                </label>
                <div className="mt-2">
                  <PhoneInput
                    key={open ? "open" : "closed"}
                    id="lead-phone"
                    name="phone"
                    defaultValue={defaults.phone}
                    onChange={(v) => set("phone", v)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lead-company" className={labelClass}>
                  Company
                </label>
                <Input
                  id="lead-company"
                  name="company"
                  value={values.company}
                  onChange={(e) => set("company", e.target.value)}
                  placeholder="Acme Inc."
                  autoComplete="off"
                  className="mt-2"
                />
              </div>
              <div>
                <label htmlFor="lead-jobTitle" className={labelClass}>
                  Job title
                </label>
                <Input
                  id="lead-jobTitle"
                  name="jobTitle"
                  value={values.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                  placeholder="Head of Marketing"
                  autoComplete="off"
                  className="mt-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="lead-website" className={labelClass}>
                  Website
                </label>
                <Input
                  id="lead-website"
                  name="website"
                  value={values.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://acme.com"
                  autoComplete="off"
                  className="mt-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="lead-country" className={labelClass}>
                  Country
                </label>
                <div className="mt-2">
                  <Combobox
                    id="lead-country"
                    value={values.country}
                    onChange={(v) => set("country", v)}
                    options={countryOptions}
                    placeholder="Select country"
                    searchPlaceholder="Search country…"
                    emptyText="No country matches."
                    allowClear
                  />
                </div>
                <input type="hidden" name="country" value={values.country} />
              </div>
              <div>
                <label htmlFor="lead-state" className={labelClass}>
                  State
                </label>
                <Input
                  id="lead-state"
                  name="state"
                  value={values.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label htmlFor="lead-city" className={labelClass}>
                  City
                </label>
                <Input
                  id="lead-city"
                  name="city"
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <SectionHeader
              icon={TrendingUp}
              title="Pipeline"
              subtitle="Where the deal sits and what comes next"
              accent="from-violet-500 to-fuchsia-600"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="lead-stage" className={labelClass}>
                  Stage *
                </label>
                <div className="mt-2">
                  <Select
                    value={values.stage}
                    onValueChange={(v) => set("stage", v as LeadStage)}
                  >
                    <SelectTrigger id="lead-stage" invalid={Boolean(errs?.stage)}>
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            STAGE_DOT_CLASS[values.stage],
                          )}
                        />
                        <SelectValue placeholder="Pick a stage" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                STAGE_DOT_CLASS[s],
                              )}
                            />
                            {LEAD_STAGE_LABEL[s]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <input type="hidden" name="stage" value={values.stage} />
                {errs?.stage ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.stage}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="lead-source" className={labelClass}>
                  Source *
                </label>
                <div className="mt-2">
                  <Select
                    value={values.source}
                    onValueChange={(v) => set("source", v as LeadSource)}
                  >
                    <SelectTrigger
                      id="lead-source"
                      invalid={Boolean(errs?.source)}
                    >
                      <SelectValue placeholder="Pick a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_SOURCE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <input type="hidden" name="source" value={values.source} />
              </div>
              <div>
                <label htmlFor="lead-estimatedValue" className={labelClass}>
                  Estimated value
                </label>
                <Input
                  id="lead-estimatedValue"
                  name="estimatedValue"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={values.estimatedValue}
                  onChange={(e) => set("estimatedValue", e.target.value)}
                  placeholder="0"
                  className={cn("mt-2", errClass("estimatedValue"))}
                />
                {errs?.estimatedValue ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.estimatedValue}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-3">
                <label className={labelClass}>Priority *</label>
                <div
                  role="radiogroup"
                  aria-label="Priority"
                  className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
                >
                  {LEAD_PRIORITIES.map((p) => {
                    const selected = values.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => set("priority", p)}
                        className={cn(
                          "inline-flex h-9 items-center justify-center rounded-md text-[12px] font-medium transition-all",
                          selected
                            ? cn(
                                LEAD_PRIORITY_BADGE_CLASS[p],
                                "shadow-sm ring-offset-1",
                              )
                            : "border border-dashed border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200",
                        )}
                      >
                        {LEAD_PRIORITY_LABEL[p]}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="priority" value={values.priority} />
                {errs?.priority ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.priority}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="lead-nextFollowUpAt" className={labelClass}>
                  Next follow-up
                </label>
                <div className="mt-2">
                  <DatePicker
                    id="lead-nextFollowUpAt"
                    value={
                      values.nextFollowUpAt
                        ? parseDateOnly(values.nextFollowUpAt)
                        : null
                    }
                    onChange={(d) =>
                      set("nextFollowUpAt", d ? toDateOnly(d) : "")
                    }
                    placeholder="Pick a date"
                    invalid={Boolean(errs?.nextFollowUpAt)}
                  />
                </div>
                <input
                  type="hidden"
                  name="nextFollowUpAt"
                  value={values.nextFollowUpAt}
                />
                {errs?.nextFollowUpAt ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.nextFollowUpAt}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="lead-assignedTo" className={labelClass}>
                  Assigned to
                </label>
                <div className="mt-2">
                  <Combobox
                    id="lead-assignedTo"
                    value={values.assignedTo}
                    onChange={(v) => set("assignedTo", v)}
                    options={assigneeOptions}
                    placeholder="Unassigned"
                    searchPlaceholder="Search teammate…"
                    emptyText={
                      memberOptions.length === 0
                        ? "No sales executives in this workspace."
                        : "No teammate matches."
                    }
                    allowClear={actorRole !== "sales_executive"}
                    invalid={Boolean(errs?.assignedTo)}
                    disabled={actorRole === "sales_executive"}
                  />
                </div>
                <input
                  type="hidden"
                  name="assignedTo"
                  value={values.assignedTo}
                />
                {actorRole === "sales_executive" ? (
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                    Sales executives can&apos;t change the assignee.
                  </p>
                ) : null}
                {errs?.assignedTo ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.assignedTo}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="lead-tags" className={labelClass}>
                  Tags
                </label>
                <Input
                  id="lead-tags"
                  name="tags"
                  value={values.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="enterprise, hot, demo-requested…"
                  className="mt-2"
                />
                {parsedTags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {parsedTags.map((t) => (
                      <span
                        key={t}
                        className="group inline-flex items-center gap-1 rounded-md bg-primary/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/15 dark:bg-primary/[0.16] dark:text-primary/90 dark:ring-primary/25"
                      >
                        <TagIcon className="h-2.5 w-2.5" />
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="ml-0.5 grid h-3.5 w-3.5 place-items-center rounded text-primary/60 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                    Comma-separated. Up to 20, lowercased.
                  </p>
                )}
              </div>

              {values.stage === "lost" ? (
                <div className="sm:col-span-3">
                  <label htmlFor="lead-lostReason" className={labelClass}>
                    Lost reason
                  </label>
                  <Input
                    id="lead-lostReason"
                    name="lostReason"
                    value={values.lostReason}
                    onChange={(e) => set("lostReason", e.target.value)}
                    placeholder="Price, timing, went with competitor…"
                    className="mt-2"
                    maxLength={280}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <SectionHeader
              icon={MessageSquare}
              title={mode === "edit" ? "Notes" : "Initial note"}
              subtitle={
                mode === "edit"
                  ? "History of conversations and context"
                  : "Optional — log the first touchpoint"
              }
              accent="from-emerald-500 to-teal-600"
            />

            {mode === "edit" && notes && notes.length > 0 ? (
              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {notes.map((n) => {
                  const authorInitial =
                    (n.authorName || "?").trim().charAt(0).toUpperCase() ||
                    "?";
                  return (
                    <li
                      key={n.id}
                      className="flex gap-2.5 rounded-lg border border-zinc-200/70 bg-white p-3 text-[12.5px] leading-relaxed text-zinc-700 shadow-sm shadow-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[10.5px] font-semibold text-white shadow-sm shadow-primary/20">
                        {authorInitial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">
                            {n.authorName}
                          </span>
                          <span>·</span>
                          <span>{n.createdAt}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : mode === "edit" ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                  No notes yet. The first one you log lands here.
                </p>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="lead-noteBody" className={labelClass}>
                  {mode === "edit" ? "Add a note" : "First note (optional)"}
                </label>
                {onGenerateNote ? (
                  <button
                    type="button"
                    onClick={handleGenerateNote}
                    disabled={generating || pending}
                    aria-busy={generating}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-primary/15"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generating ? "Drafting…" : "Draft with AI"}
                  </button>
                ) : null}
              </div>
              <textarea
                id="lead-noteBody"
                name="noteBody"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Call summary, intent signals, next step…"
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              {aiError ? (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {aiError}
                </p>
              ) : null}
              {noteBody.length > 0 ? (
                <p className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-500">
                  <span>
                    {mode === "edit"
                      ? "Saving will set last contact to now."
                      : "We'll save this as the lead's first note."}
                  </span>
                  <span className="tabular-nums">
                    {noteBody.length} / 4000
                  </span>
                </p>
              ) : null}
            </div>
          </section>
        </div>

        {state?.formError ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {state.formError}
          </p>
        ) : null}

        <div className="-mx-6 -mb-6 mt-6 flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
            {noteBody.trim().length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Logging a new note
              </span>
            ) : mode === "edit" ? (
              <span>Changes apply immediately on save.</span>
            ) : (
              <span>
                {values.assignedTo
                  ? "Will be assigned on save."
                  : "Will be created unassigned."}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? submittingLabel : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Popup>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br text-white shadow-sm",
          accent,
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
        />
        <Icon className="relative h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AssigneeRow({
  name,
  email,
  image,
  isYou,
  compact,
}: {
  name: string;
  email: string;
  image: string | null;
  isYou: boolean;
  compact?: boolean;
}) {
  const size = compact ? "h-5 w-5" : "h-6 w-6";
  const text = compact ? "text-[10.5px]" : "text-[11px]";
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          className={cn(
            size,
            "shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700",
          )}
        />
      ) : (
        <span
          className={cn(
            size,
            text,
            "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary font-semibold text-white",
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">
        <span className="truncate text-[13px] text-zinc-900 dark:text-zinc-100">
          {name}
        </span>
        {isYou ? (
          <span className="ml-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            (you)
          </span>
        ) : null}
        {!compact ? (
          <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {email}
          </span>
        ) : null}
      </span>
    </span>
  );
}
