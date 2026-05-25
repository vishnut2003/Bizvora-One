"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Users } from "lucide-react";
import Button from "@/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/cn";
import { updateProjectTeam, type ProjectTeamActionState } from "../../actions";

export type ProjectTeamMember = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export default function ProjectTeamManager({
  workspaceId,
  projectId,
  defaultTeam,
  members,
}: {
  workspaceId: string;
  projectId: string;
  defaultTeam: string[];
  members: ProjectTeamMember[];
}) {
  const router = useRouter();
  const [team, setTeam] = useState<string[]>(defaultTeam);
  const [state, setState] = useState<ProjectTeamActionState>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // cmdk's <Command> scrolls its first item into view on mount, which can drag
  // the page down. Snap back to the top after that mount scroll has run.
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTeam(id: string) {
    setSaved(false);
    setTeam((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProjectTeam(
        workspaceId,
        projectId,
        state,
        formData,
      );
      if (result.ok) {
        setState({});
        setSaved(true);
        router.refresh();
      } else {
        setSaved(false);
        setState(result);
      }
    });
  };

  const teamPreview = members.filter((m) => team.includes(m.id));

  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-5 text-[12.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        No workspace members yet — invite teammates first, then assign them here.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
            />
            <Users className="relative h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
              Project team
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
              {teamPreview.length === 0
                ? "No one assigned yet"
                : `${teamPreview.length} ${
                    teamPreview.length === 1 ? "member" : "members"
                  } on this project`}
            </p>
          </div>
        </div>

        {teamPreview.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
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

        <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
          <Command>
            <CommandInput placeholder="Search teammates by name or email" />
            <CommandList className="max-h-72">
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
                        checked && "bg-primary/5 dark:bg-primary/10",
                      )}
                    >
                      <Avatar member={m} />
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-1 text-zinc-400">· {m.email}</span>
                      </span>
                      <Check
                        className={cn(
                          "ml-2 h-3.5 w-3.5 shrink-0",
                          checked ? "text-primary opacity-100" : "opacity-0",
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

        {state.errors?.team ? (
          <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">
            {state.errors.team}
          </p>
        ) : null}
      </div>

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
              Team saved.
            </span>
          ) : (
            "Tick teammates to add them, then save."
          )}
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Save team"}
        </Button>
      </div>
    </form>
  );
}

function Avatar({ member }: { member: ProjectTeamMember }) {
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
