import "server-only";

// Per-IP fixed-window rate limit, kept on globalThis so the dev server's HMR
// doesn't wipe it between saves. Single-process MVP only — for multi-region
// production this should be backed by Redis or a similar shared store.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

type Bucket = { count: number; resetAt: number };

declare global {
  var __webFormRateLimit: Map<string, Bucket> | undefined;
}

function store(): Map<string, Bucket> {
  if (!globalThis.__webFormRateLimit) {
    globalThis.__webFormRateLimit = new Map();
  }
  return globalThis.__webFormRateLimit;
}

export function rateLimitWebForm(ip: string): {
  ok: boolean;
  retryAfter: number;
} {
  const now = Date.now();
  const s = store();
  const existing = s.get(ip);

  if (!existing || existing.resetAt <= now) {
    s.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}
