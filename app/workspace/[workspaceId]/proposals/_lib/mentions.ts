// Mention tokens look like `@[Display Name](type:objectId)` where `type` is
// either `lead` or `customer`. Tokens live verbatim in the persisted message
// content; the chat UI renders them as pills and the server expands them into
// a CRM-context block before handing the conversation to the model.

export type MentionType = "lead" | "customer";

export type MentionRef = {
  type: MentionType;
  id: string;
  name: string;
};

export type MentionSearchResult = {
  type: MentionType;
  id: string;
  name: string;
  subtitle: string;
};

export const MENTION_TOKEN_REGEX =
  /@\[([^\]]+)\]\((lead|customer):([0-9a-fA-F]{24})\)/g;

export function parseMentions(text: string): MentionRef[] {
  if (!text || !text.includes("@[")) return [];
  const out: MentionRef[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(MENTION_TOKEN_REGEX)) {
    const key = `${m[2]}:${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: m[1], type: m[2] as MentionType, id: m[3] });
  }
  return out;
}

export function formatMentionToken(ref: MentionRef): string {
  return `@[${ref.name}](${ref.type}:${ref.id})`;
}

// Identify an `@query` segment that the caret is currently inside, so the UI
// can pop the mention picker. Returns null when the caret isn't following an
// open `@` token.
export function findActiveMentionQuery(
  value: string,
  caret: number,
): { start: number; end: number; query: string } | null {
  if (caret < 0 || caret > value.length) return null;
  let i = caret - 1;
  while (i >= 0) {
    const ch = value[i];
    if (ch === "@") {
      const prev = i > 0 ? value[i - 1] : "";
      const atBoundary = i === 0 || /\s/.test(prev) || prev === "(";
      if (!atBoundary) return null;
      const query = value.slice(i + 1, caret);
      // Once the user types a `]` we've moved past the picker zone (or the
      // token was already inserted in full).
      if (query.includes("]") || query.includes("[")) return null;
      return { start: i, end: caret, query };
    }
    if (/\s/.test(ch)) return null;
    i--;
  }
  return null;
}

// Split a message into plain-text chunks and resolved mention pills so the
// chat UI can render mentions as styled chips instead of raw token syntax.
export type MentionSegment =
  | { kind: "text"; value: string }
  | { kind: "mention"; ref: MentionRef };

export function splitMentionSegments(text: string): MentionSegment[] {
  if (!text) return [];
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_TOKEN_REGEX)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ kind: "text", value: text.slice(last, idx) });
    segments.push({
      kind: "mention",
      ref: { name: m[1], type: m[2] as MentionType, id: m[3] },
    });
    last = idx + m[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", value: text.slice(last) });
  return segments;
}
