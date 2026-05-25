"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Building2,
  CalendarRange,
  Check,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/button";
import Combobox, { type ComboboxOption } from "@/components/combobox";
import DatePicker from "@/components/date-picker";
import Input from "@/components/input";
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
  PROJECT_STATUS_DOT_CLASS,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/lib/project";
import { updateProject, type ProjectActionState } from "../../actions";

export type ProjectFormCustomer = {
  id: string;
  name: string;
  company: string;
};

export type EditProjectDefaults = {
  name: string;
  description: string;
  client: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
};

const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  // Local midnight — avoids the off-by-one day a bare ISO date can cause.
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function EditProjectForm({
  workspaceId,
  projectId,
  defaults,
  customers,
}: {
  workspaceId: string;
  projectId: string;
  defaults: EditProjectDefaults;
  customers: ProjectFormCustomer[];
}) {
  const router = useRouter();

  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [client, setClient] = useState(defaults.client);
  const [status, setStatus] = useState<ProjectStatus>(defaults.status);
  const [startDate, setStartDate] = useState<Date | null>(
    parseDateValue(defaults.startDate),
  );
  const [endDate, setEndDate] = useState<Date | null>(
    parseDateValue(defaults.endDate),
  );

  const [state, setState] = useState<ProjectActionState>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProject(
        workspaceId,
        projectId,
        state,
        formData,
      );
      if (result.ok) {
        setState({});
        setSaved(true);
        // Refresh so the project header (name/status) reflects the change.
        router.refresh();
      } else {
        setSaved(false);
        setState(result);
      }
    });
  };

  const errs = state.errors;
  const errClass = (key: keyof NonNullable<typeof errs>) =>
    errs?.[key]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "";

  const selectedClient = customers.find((c) => c.id === client) ?? null;

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

  // Clear the "saved" flag as soon as the user edits a field again.
  const touch =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setSaved(false);
      setter(v);
    };

  return (
    <form action={formAction} className="space-y-5">
      {/* Project basics */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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
              onChange={(e) => touch(setName)(e.target.value)}
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
              onChange={(e) => touch(setDescription)(e.target.value)}
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
              <span className="tabular-nums">{description.length} / 4000</span>
            </p>
          </div>
        </div>
      </section>

      {/* Schedule & status */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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
              onValueChange={(v) => touch(setStatus)(v as ProjectStatus)}
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
                  setSaved(false);
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
                onChange={(d) => {
                  setSaved(false);
                  setEndDate(d);
                }}
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

      {/* Client */}
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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
              onChange={(v) => touch(setClient)(v)}
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
              Optional — leave empty to keep this project client-less.
            </p>
          )}
        </div>
      </section>

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:px-5 dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Project details saved.
            </span>
          ) : (
            "Changes apply as soon as you save."
          )}
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
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
