"use client";

import { useState } from "react";
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  MessageSquarePlus,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/button";
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
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABEL,
  FEEDBACK_MESSAGE_MAX,
  type FeedbackCategory,
} from "@/lib/feedback";

const CATEGORY_META: Record<
  FeedbackCategory,
  { icon: LucideIcon; hint: string; badge: string }
> = {
  bug: {
    icon: Bug,
    hint: "Something isn't working",
    badge:
      "bg-rose-100 text-rose-600 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/25",
  },
  idea: {
    icon: Lightbulb,
    hint: "A suggestion or feature request",
    badge:
      "bg-amber-100 text-amber-600 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/25",
  },
  other: {
    icon: MessageCircle,
    hint: "General feedback",
    badge:
      "bg-primary/10 text-primary ring-primary/20 dark:bg-primary/15 dark:ring-primary/25",
  },
};

const textareaClasses =
  "min-h-[120px] w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export default function FeedbackCard({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setCategory("bug");
    setMessage("");
    setError(null);
    setDone(false);
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      // Reset after the close animation so the form doesn't flicker.
      setTimeout(reset, 200);
    }
  }

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please enter a message.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: trimmed }),
      });
      if (!res.ok) {
        setError("Couldn't send feedback. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't send feedback. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="shrink-0 pt-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-gradient-to-br from-white via-white to-primary/5 p-3 text-left transition-colors hover:border-primary/40 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-primary/10 dark:hover:border-primary/40"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 blur-2xl"
        />
        <div className="relative flex items-start gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
              Send feedback
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Spotted a bug or have an idea? Tell us.
            </p>
          </div>
        </div>
      </button>

      <Popup open={open} onOpenChange={handleOpenChange}>
        {done ? (
          <div className="px-6 pb-8 pt-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <DialogTitle className="mt-4 text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
              Thanks for your feedback!
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              We&apos;ve received your note and will take a look.
            </DialogDescription>
            <div className="mt-6">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2 pt-6">
              <DialogTitle className="text-[17px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white">
                Send feedback
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Found a bug or have an idea to improve Bizvora One? Let us know.
              </DialogDescription>
            </div>

            <div className="space-y-4 px-6 pt-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="feedback-category"
                  className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Category
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as FeedbackCategory)}
                  disabled={pending}
                >
                  <SelectTrigger id="feedback-category" className="h-11">
                    <SelectValue
                      aria-label={FEEDBACK_CATEGORY_LABEL[category]}
                    >
                      {(() => {
                        const meta = CATEGORY_META[category];
                        const Icon = meta.icon;
                        return (
                          <span className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md ring-1 ring-inset",
                                meta.badge,
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                              {FEEDBACK_CATEGORY_LABEL[category]}
                            </span>
                          </span>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map((c) => {
                      const meta = CATEGORY_META[c];
                      const Icon = meta.icon;
                      return (
                        <SelectItem key={c} value={c} className="py-1.5 pl-2.5">
                          <span className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md ring-1 ring-inset",
                                meta.badge,
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="flex flex-col leading-tight">
                              <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                                {FEEDBACK_CATEGORY_LABEL[c]}
                              </span>
                              <span className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                                {meta.hint}
                              </span>
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="feedback-message"
                  className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={FEEDBACK_MESSAGE_MAX}
                  disabled={pending}
                  placeholder="Tell us what's on your mind…"
                  className={textareaClasses}
                />
              </div>

              {error ? (
                <p className="text-[12px] text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="px-6 pb-6 pt-4">
              <div className="-mx-6 flex items-center justify-end gap-2 border-t border-zinc-100 px-6 pt-4 dark:border-zinc-800">
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
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? "Sending…" : "Send feedback"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Popup>
    </div>
  );
}
