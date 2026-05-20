import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/time";
import {
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_DOT_CLASS,
  PROJECT_STATUS_LABEL,
  type ProjectStatus,
} from "@/lib/project";

type TeamMember = {
  id: string;
  name: string;
  image?: string | null;
};

export type ProjectCardData = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  client: { id: string; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  team: TeamMember[];
  updatedAt: string;
};

const STATUS_STRIPE: Record<ProjectStatus, string> = {
  planning: "from-indigo-400 via-indigo-500 to-violet-500",
  active: "from-emerald-400 via-emerald-500 to-teal-500",
  on_hold: "from-amber-400 via-amber-500 to-orange-500",
  completed: "from-zinc-300 via-zinc-400 to-zinc-500",
  cancelled: "from-rose-400 via-rose-500 to-red-500",
};

const STATUS_FILL: Record<ProjectStatus, string> = {
  planning: "bg-indigo-500",
  active: "bg-emerald-500",
  on_hold: "bg-amber-500",
  completed: "bg-zinc-400",
  cancelled: "bg-rose-500",
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dateRangeLabel(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates not set";
  if (start && end) {
    const sameYear =
      new Date(start).getFullYear() === new Date(end).getFullYear();
    const sYear = new Date(start).getFullYear();
    const eYear = new Date(end).getFullYear();
    if (sameYear) {
      return `${formatShortDate(start)} – ${formatShortDate(end)}, ${eYear}`;
    }
    return `${formatShortDate(start)} ${sYear} – ${formatShortDate(end)} ${eYear}`;
  }
  if (start) return `Starts ${formatShortDate(start)}`;
  return `Due ${formatShortDate(end as string)}`;
}

function progressPercent(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e <= s) return null;
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function ProjectCard({ project }: { project: ProjectCardData }) {
  const visibleTeam = project.team.slice(0, 4);
  const extraTeam = Math.max(0, project.team.length - visibleTeam.length);
  const progress = progressPercent(project.startDate, project.endDate);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 pt-[22px] transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_38px_-18px_rgba(24,24,27,0.22)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      {/* Status stripe */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r",
          STATUS_STRIPE[project.status],
        )}
      />

      {/* Hover gradient wash */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30",
          STATUS_STRIPE[project.status],
        )}
      />

      {/* Header: status + updated */}
      <div className="relative flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
            PROJECT_STATUS_BADGE_CLASS[project.status],
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              PROJECT_STATUS_DOT_CLASS[project.status],
            )}
          />
          {PROJECT_STATUS_LABEL[project.status]}
        </span>
        <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-400 dark:text-zinc-500">
          <Clock className="h-2.5 w-2.5" />
          {timeAgo(new Date(project.updatedAt))}
        </span>
      </div>

      {/* Title */}
      <h3 className="relative mt-3 line-clamp-2 text-[15.5px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100">
        {project.name}
      </h3>

      {/* Client chip */}
      {project.client ? (
        <div className="relative mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[11.5px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300">
          <Building2 className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
          <span className="truncate">{project.client.name}</span>
        </div>
      ) : (
        <p className="relative mt-2 inline-flex w-fit items-center gap-1.5 text-[11.5px] italic text-zinc-400 dark:text-zinc-500">
          <Building2 className="h-3 w-3" />
          No client linked
        </p>
      )}

      {/* Description */}
      {project.description ? (
        <p className="relative mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {project.description}
        </p>
      ) : (
        <p className="relative mt-3 text-[12.5px] italic text-zinc-400 dark:text-zinc-500">
          No description yet.
        </p>
      )}

      {/* Schedule */}
      <div className="relative mt-4">
        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="h-3 w-3" />
            {dateRangeLabel(project.startDate, project.endDate)}
          </span>
          {progress !== null ? (
            <span className="tabular-nums text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              {progress}%
            </span>
          ) : null}
        </div>
        {progress !== null ? (
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            aria-hidden
          >
            <div
              className={cn("h-full rounded-full", STATUS_FILL[project.status])}
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* Footer: team + open hint */}
      <div className="relative mt-auto flex items-center justify-between gap-3 pt-4">
        {project.team.length === 0 ? (
          <p className="inline-flex items-center gap-1 text-[11.5px] text-zinc-400 dark:text-zinc-500">
            <Users className="h-3 w-3" />
            No team
          </p>
        ) : (
          <div className="flex items-center -space-x-1.5">
            {visibleTeam.map((m) => (
              <span
                key={m.id}
                title={m.name}
                className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-900"
              >
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(m.name)
                )}
              </span>
            ))}
            {extraTeam > 0 ? (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-700 ring-2 ring-white dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-900">
                +{extraTeam}
              </span>
            ) : null}
          </div>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200">
          Open
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </article>
  );
}
