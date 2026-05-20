"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Building2,
  CalendarRange,
  Check,
  FolderKanban,
  Plus,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/button";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import DatePicker from "@/components/date-picker";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_DOT_CLASS,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/lib/project";
import { createProject, type ProjectActionState } from "../actions";

export type ProjectFormCustomer = {
  id: string;
  name: string;
  company: string;
};

export type ProjectFormMember = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type Props = {
  workspaceId: string;
  customers: ProjectFormCustomer[];
  members: ProjectFormMember[];
};

const INITIAL_STATE: ProjectActionState = {};
const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

export default function AddProjectButton({
  workspaceId,
  customers,
  members,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [team, setTeam] = useState<string[]>([]);

  const [state, formAction, pending] = useActionState(
    (prev: ProjectActionState, formData: FormData) =>
      createProject(workspaceId, prev, formData),
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setName("");
      setDescription("");
      setClient("");
      setStatus("planning");
      setStartDate(null);
      setEndDate(null);
      setTeam([]);
      router.refresh();
    }
  }, [state, router]);

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
  }

  function toggleTeam(id: string) {
    setTeam((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const errs = state.errors;
  const errClass = (key: keyof NonNullable<typeof errs>) =>
    errs?.[key]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "";

  const selectedClient = customers.find((c) => c.id === client) ?? null;
  const teamPreview = members.filter((m) => team.includes(m.id));

  const clientOptions = useMemo<ComboboxOption<string>[]>(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name,
        keywords: c.company ? [c.company] : [],
        renderItem: (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px]">{c.name}</span>
            {c.company ? (
              <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {c.company}
              </span>
            ) : null}
          </span>
        ),
        renderTrigger: (
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[13px] text-zinc-900 dark:text-zinc-100">
              {c.name}
            </span>
            {c.company ? (
              <span className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                · {c.company}
              </span>
            ) : null}
          </span>
        ),
      })),
    [customers],
  );

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        New project
      </Button>

      <Popup
        open={open}
        onOpenChange={handleOpenChange}
        className="max-h-[92vh] overflow-hidden sm:max-w-2xl"
      >
        {/* Hero header */}
        <div className="relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.08] via-white to-violet-500/[0.06] dark:from-indigo-500/[0.18] dark:via-zinc-900 dark:to-violet-500/[0.12]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 opacity-50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-gradient-to-tr from-violet-500/20 to-indigo-500/15 opacity-40 blur-3xl"
          />
          <div className="relative flex items-center gap-3.5 px-6 pb-5 pt-6">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
              />
              <Sparkles className="relative h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  Create project
                </DialogTitle>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    PROJECT_STATUS_BADGE_CLASS[status],
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      PROJECT_STATUS_DOT_CLASS[status],
                    )}
                  />
                  {PROJECT_STATUS_LABEL[status]}
                </span>
              </div>
              <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Capture the basics — you can refine scope, milestones, and team
                later.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form
          action={formAction}
          className="max-h-[calc(92vh-12rem)] overflow-y-auto px-6 pb-6 pt-5"
        >
          <div className="space-y-5">
            {/* Section: Project basics */}
            <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <SectionHeader
                icon={FolderKanban}
                title="Project basics"
                subtitle="What it's called and what it covers"
                accent="from-indigo-500 to-violet-600"
              />
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="project-name" className={labelClass}>
                    Project name *
                  </label>
                  <Input
                    id="project-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme website redesign"
                    required
                    maxLength={160}
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
                  <label htmlFor="project-description" className={labelClass}>
                    Description
                  </label>
                  <textarea
                    id="project-description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="Short overview of scope, goals, or context."
                    className={cn(
                      "mt-2 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500",
                      errClass("description"),
                    )}
                  />
                  <p className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                    {errs?.description ? (
                      <span className="text-red-600 dark:text-red-400">
                        {errs.description}
                      </span>
                    ) : (
                      <span>Plain text — formatting comes later.</span>
                    )}
                    <span className="tabular-nums">
                      {description.length} / 4000
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Section: Schedule & status */}
            <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <SectionHeader
                icon={CalendarRange}
                title="Schedule & status"
                subtitle="When work starts and where it stands"
                accent="from-emerald-500 to-teal-600"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="project-status" className={labelClass}>
                    Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as ProjectStatus)}
                  >
                    <SelectTrigger id="project-status" className="mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                PROJECT_STATUS_DOT_CLASS[s],
                              )}
                            />
                            {PROJECT_STATUS_LABEL[s]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="status" value={status} />
                  {errs?.status ? (
                    <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                      {errs.status}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="project-start" className={labelClass}>
                    Start date
                  </label>
                  <div className="mt-2">
                    <DatePicker
                      id="project-start"
                      value={startDate}
                      onChange={(d) => {
                        setStartDate(d);
                        if (d && endDate && endDate < d) setEndDate(null);
                      }}
                      placeholder="Pick a start date"
                      invalid={Boolean(errs?.startDate)}
                    />
                  </div>
                  <input
                    type="hidden"
                    name="startDate"
                    value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                  />
                  {errs?.startDate ? (
                    <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                      {errs.startDate}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="project-end" className={labelClass}>
                    End date
                  </label>
                  <div className="mt-2">
                    <DatePicker
                      id="project-end"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Pick an end date"
                      minDate={startDate ?? undefined}
                      invalid={Boolean(errs?.endDate)}
                    />
                  </div>
                  <input
                    type="hidden"
                    name="endDate"
                    value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                  />
                  {errs?.endDate ? (
                    <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                      {errs.endDate}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Section: Client */}
            <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <SectionHeader
                icon={Building2}
                title="Client"
                subtitle="Link the project to a customer in this workspace"
                accent="from-amber-500 to-orange-600"
              />
              <div>
                <label htmlFor="project-client" className={labelClass}>
                  Customer
                </label>
                <div className="mt-2">
                  <Combobox<string>
                    id="project-client"
                    value={client}
                    onChange={(v) => setClient(v)}
                    options={clientOptions}
                    placeholder="Search and select a customer"
                    searchPlaceholder="Search by name or company"
                    emptyText="No matching customers"
                    invalid={Boolean(errs?.client)}
                    allowClear
                  />
                </div>
                <input type="hidden" name="client" value={client} />
                {errs?.client ? (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    {errs.client}
                  </p>
                ) : selectedClient ? (
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Linked to{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {selectedClient.name}
                    </span>
                    {selectedClient.company ? ` — ${selectedClient.company}` : ""}.
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    Optional — you can attach a client later.
                  </p>
                )}
              </div>
            </section>

            {/* Section: Team */}
            <section className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <SectionHeader
                icon={Users}
                title="Team"
                subtitle="Who's working on this project"
                accent="from-blue-500 to-indigo-600"
              />
              {members.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-200 bg-white px-3 py-3 text-[12px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
                  No workspace members yet — invite teammates first.
                </p>
              ) : (
                <>
                  {teamPreview.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {teamPreview.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11.5px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                          <Avatar member={m} />
                          {m.name}
                          <button
                            type="button"
                            onClick={() => toggleTeam(m.id)}
                            aria-label={`Remove ${m.name}`}
                            className="ml-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
                    <Command>
                      <CommandInput placeholder="Search teammates by name or email" />
                      <CommandList className="max-h-56">
                        <CommandEmpty>No teammates match.</CommandEmpty>
                        <CommandGroup>
                          {members.map((m) => {
                            const checked = team.includes(m.id);
                            return (
                              <CommandItem
                                key={m.id}
                                value={`${m.name} ${m.email} ${m.id}`}
                                onSelect={() => toggleTeam(m.id)}
                                className={cn(
                                  "flex items-center gap-2.5",
                                  checked &&
                                    "bg-primary/5 dark:bg-primary/10",
                                )}
                              >
                                <Avatar member={m} />
                                <span className="min-w-0 flex-1 truncate text-[13px]">
                                  <span className="font-medium">{m.name}</span>
                                  <span className="ml-1 text-zinc-400">
                                    · {m.email}
                                  </span>
                                </span>
                                <Check
                                  className={cn(
                                    "ml-2 h-3.5 w-3.5 shrink-0",
                                    checked
                                      ? "text-primary opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                  {team.map((id) => (
                    <input key={id} type="hidden" name="team" value={id} />
                  ))}
                </>
              )}
              {errs?.team ? (
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  {errs.team}
                </p>
              ) : null}
            </section>
          </div>

          {state.formError ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {state.formError}
            </p>
          ) : null}

          <div className="-mx-6 -mb-6 mt-6 flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
              {teamPreview.length > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {teamPreview.length}{" "}
                  {teamPreview.length === 1 ? "teammate" : "teammates"} on this
                  project
                </span>
              ) : (
                <span>Starts unassigned — you can add team anytime.</span>
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
                {pending ? "Creating…" : "Create project"}
              </Button>
            </div>
          </div>
        </form>
      </Popup>
    </>
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

function Avatar({ member }: { member: ProjectFormMember }) {
  const initials =
    member.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[9px] font-semibold text-white">
      {member.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.image}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
