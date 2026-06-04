"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationDTO } from "@/lib/notification";

const POLL_MS = 45_000;

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const base = `/api/workspace/${workspaceId}/notifications`;

  // Poll the notifications endpoint while mounted. The fetch is the external
  // system here; state is only updated from inside the async callback (after
  // awaits and a cancellation check), never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(base, { cache: "no-store" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          unreadCount: number;
          items: NotificationDTO[];
        };
        if (cancelled) return;
        setItems(data.items ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // Network hiccup — keep the last good state and retry next tick.
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [base]);

  const markRead = useCallback(
    async (id?: string) => {
      try {
        await fetch(`${base}/read`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(id ? { id } : {}),
        });
      } catch {
        // Best-effort; the next poll will reconcile state.
      }
    },
    [base],
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markRead();
  }, [markRead]);

  const handleItemClick = useCallback(
    async (n: NotificationDTO) => {
      setOpen(false);
      if (!n.read) {
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await markRead(n.id);
      }
      router.push(n.link);
    },
    [markRead, router],
  );

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Open notifications"
        className="group relative grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white/80 text-zinc-600 backdrop-blur transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-900 data-[state=open]:border-zinc-300 data-[state=open]:bg-white dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white dark:data-[state=open]:border-zinc-700 dark:data-[state=open]:bg-zinc-900"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-linear-to-br from-primary to-secondary px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-white dark:ring-zinc-950">
            {badge}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Notifications
          </p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.read
                          ? "bg-transparent"
                          : "bg-linear-to-br from-primary to-secondary"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-zinc-400 dark:text-zinc-500">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
