"use client";

import { useRef, useState, useTransition } from "react";
import Button from "@/components/button";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { WORKSPACE_COLORS, type WorkspaceColor } from "@/lib/workspace";
import {
  createWorkspace,
  type CreateWorkspaceState,
} from "../actions";

const swatchClasses: Record<WorkspaceColor, string> = {
  violet: "bg-gradient-to-br from-violet-500 to-purple-700",
  fuchsia: "bg-gradient-to-br from-fuchsia-500 to-pink-700",
  blue: "bg-gradient-to-br from-blue-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-700",
  amber: "bg-gradient-to-br from-amber-500 to-orange-700",
  rose: "bg-gradient-to-br from-rose-500 to-red-700",
};

const accentShadow: Record<WorkspaceColor, string> = {
  violet: "shadow-violet-500/25",
  fuchsia: "shadow-fuchsia-500/25",
  blue: "shadow-blue-500/25",
  emerald: "shadow-emerald-500/25",
  amber: "shadow-amber-500/25",
  rose: "shadow-rose-500/25",
};

export default function CreateWorkspaceCard() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<WorkspaceColor>("violet");
  const [state, setState] = useState<CreateWorkspaceState>(undefined);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      formRef.current?.reset();
      setName("");
      setColor("violet");
      setState(undefined);
    }
    setOpen(next);
  };

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await createWorkspace(state, formData);
      if (result?.ok) {
        handleOpenChange(false);
      } else {
        setState(result);
      }
    });
  };

  const trimmedName = name.trim();
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : "A";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left transition-all hover:border-primary/40 hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-primary/40 dark:hover:bg-zinc-800/50"
      >
        <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg">
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg border border-dashed border-zinc-300 transition-opacity group-hover:opacity-0 dark:border-zinc-700"
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-secondary opacity-0 shadow-md shadow-primary/30 transition-opacity group-hover:opacity-100"
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          />
          <Plus className="relative h-4 w-4 text-zinc-400 transition-colors group-hover:text-white dark:text-zinc-500" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            New workspace
          </p>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            Set up a new pipeline for your team
          </p>
        </div>

        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent text-zinc-300 transition-all group-hover:border-zinc-200 group-hover:bg-white group-hover:text-zinc-900 group-hover:shadow-sm dark:text-zinc-600 dark:group-hover:border-zinc-700 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-100"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        <div className="relative px-6 pb-5 pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-primary/[0.04] via-primary/[0.02] to-transparent dark:from-primary/[0.08] dark:via-primary/[0.04]"
          />
          <div className="flex items-start gap-3.5">
            <span
              className={cn(
                "relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-[17px] font-semibold text-white shadow-md transition-all duration-200",
                swatchClasses[color],
                accentShadow[color],
                !trimmedName && "opacity-50 saturate-50",
              )}
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
              />
              <span
                aria-hidden
                className="absolute inset-0 ring-1 ring-inset ring-white/15"
              />
              <span className="relative">{initial}</span>
            </span>
            <div className="flex-1 pt-0.5">
              <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Create a workspace
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Organize your team&apos;s contacts, deals, and pipelines in a
                dedicated space.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form ref={formRef} action={formAction} className="px-6 pb-6">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="workspace-name"
                className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
              >
                Workspace name
              </label>
              <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                {name.length}/80
              </span>
            </div>
            <Input
              id="workspace-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Sales"
              autoComplete="off"
              maxLength={80}
              required
              aria-invalid={state?.errors?.name ? true : undefined}
              className={cn(
                "mt-2 h-11",
                state?.errors?.name &&
                  "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500",
              )}
            />
            {state?.errors?.name ? (
              <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                {state.errors.name}
              </p>
            ) : null}
          </div>

          <fieldset className="mt-5">
            <legend className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Accent color
            </legend>
            <input type="hidden" name="color" value={color} />
            <div className="mt-2 flex gap-2">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className={cn(
                    "relative grid h-8 w-8 place-items-center overflow-hidden rounded-full transition-all duration-200 hover:scale-110",
                    swatchClasses[c],
                    color === c
                      ? "scale-110 ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                      : "shadow-sm",
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/15"
                  />
                  {color === c ? (
                    <Check
                      aria-hidden
                      className="relative h-3.5 w-3.5 text-white drop-shadow-sm"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>

          {state?.formError ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {state.formError}
            </p>
          ) : null}

          <div className="-mx-6 mt-6 flex items-center justify-end gap-2 border-t border-zinc-100 px-6 pt-4 dark:border-zinc-800">
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
              disabled={pending || !trimmedName}
              aria-busy={pending}
            >
              {pending ? "Creating…" : "Create workspace"}
            </Button>
          </div>
        </form>
      </Popup>
    </>
  );
}
