"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  FileText,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";
import type { ProposalDocument } from "@/lib/proposal-ai";
import { searchMentionables, sendProposalMessage } from "../actions";
import type {
  SerializedProposalChat,
  SerializedProposalMessage,
} from "../_lib/serialize";
import {
  findActiveMentionQuery,
  formatMentionToken,
  splitMentionSegments,
  type MentionSearchResult,
} from "../_lib/mentions";
import { useRail } from "./proposals-chat-shell";
import ProposalPdfViewer from "./proposal-pdf-viewer";
import MentionPopover from "./mention-popover";

type Props = {
  workspaceId: string;
  workspaceName: string;
  userImage: string | null;
  userInitial: string;
  initialChat: SerializedProposalChat | null;
};

const suggestionPrompts = [
  "Draft a SaaS onboarding proposal for Acme",
  "Create a retainer proposal with monthly milestones",
  "Compare 3 pricing tiers in a feature matrix",
  "Outline a discovery-to-launch timeline",
];

function makeLocalId() {
  return `local-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function latestProposalIn(
  messages: SerializedProposalMessage[],
): ProposalDocument | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.proposal) return m.proposal;
  }
  return null;
}

export default function ChatWorkspace({
  workspaceId,
  workspaceName,
  userImage,
  userInitial,
  initialChat,
}: Props) {
  const router = useRouter();
  const { setIsRailOpen } = useRail();

  const [messages, setMessages] = useState<SerializedProposalMessage[]>(
    initialChat?.messages ?? [],
  );
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfWidth, setPdfWidth] = useState(40);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  // Mention picker state: when the caret sits inside an `@query` token we
  // show a small popover with workspace leads + customers to pick from.
  const [mention, setMention] = useState<{
    start: number;
    end: number;
    query: string;
  } | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionSearchResult[]>(
    [],
  );
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionActiveIdx, setMentionActiveIdx] = useState(0);
  const mentionSearchSeq = useRef(0);
  // Anchor position of an `@`-token the user dismissed with Escape. While the
  // caret stays inside that same token we must not re-open the popover, even
  // though the trigger text is still in the textarea.
  const dismissedMentionStart = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingPdf = useRef(false);

  const chatId = initialChat?.id ?? null;
  const title = initialChat?.title ?? "New conversation";

  const activeProposal = useMemo(() => latestProposalIn(messages), [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isThinking]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    function onMove(e: globalThis.MouseEvent) {
      if (!isResizingPdf.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pxFromRight = rect.right - e.clientX;
      const percent = (pxFromRight / rect.width) * 100;
      setPdfWidth(Math.max(20, Math.min(70, percent)));
    }
    function onUp() {
      if (!isResizingPdf.current) return;
      isResizingPdf.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startPdfResize(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    isResizingPdf.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const syncMention = useCallback((value: string, caret: number) => {
    const next = findActiveMentionQuery(value, caret);
    // If the user dismissed the picker for this exact `@`-token with Escape,
    // suppress it until the caret leaves that token (or the `@` is deleted).
    if (next && dismissedMentionStart.current === next.start) {
      setMention(null);
      setMentionResults([]);
      setMentionActiveIdx(0);
      return;
    }
    dismissedMentionStart.current = null;
    setMention(next);
    if (!next) {
      setMentionResults([]);
      setMentionActiveIdx(0);
    }
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInput(value);
    syncMention(value, e.target.selectionStart ?? value.length);
  }

  function handleCaretMove(e: SyntheticEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    syncMention(el.value, el.selectionStart ?? el.value.length);
  }

  // Debounced search whenever the active mention query changes.
  useEffect(() => {
    if (!mention) return;
    const seq = ++mentionSearchSeq.current;
    const timer = window.setTimeout(async () => {
      // Loading flag flips inside the async callback (not the effect body)
      // so we don't trigger a synchronous render right when the effect runs.
      setMentionLoading(true);
      const res = await searchMentionables(workspaceId, mention.query);
      if (seq !== mentionSearchSeq.current) return;
      setMentionLoading(false);
      if (res.ok) {
        setMentionResults(res.results);
        setMentionActiveIdx(0);
      } else {
        setMentionResults([]);
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [mention, workspaceId]);

  function insertMention(result: MentionSearchResult) {
    if (!mention) return;
    const token = formatMentionToken({
      type: result.type,
      id: result.id,
      name: result.name,
    });
    const before = input.slice(0, mention.start);
    const after = input.slice(mention.end);
    // Pad with a trailing space so the next character isn't glued to the
    // token (also makes the picker dismiss naturally on the next keystroke).
    const insertion = `${token} `;
    const nextValue = `${before}${insertion}${after}`;
    setInput(nextValue);
    setMention(null);
    setMentionResults([]);
    setMentionActiveIdx(0);
    dismissedMentionStart.current = null;

    // Restore focus + caret position after React commits the new value.
    const caret = before.length + insertion.length;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isThinking) return;

    setErrorMessage(null);
    setInput("");
    setIsThinking(true);

    const optimisticUserMsg: SerializedProposalMessage = {
      id: makeLocalId(),
      role: "user",
      content: text,
      proposal: null,
      createdAt: new Date().toISOString(),
    };
    const snapshot = messages;
    setMessages((prev) => [...prev, optimisticUserMsg]);

    const result = await sendProposalMessage(workspaceId, chatId, text);

    setIsThinking(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      setMessages(snapshot);
      setInput(text);
      return;
    }

    if (!chatId) {
      // First send on /new — swap URL to the persisted chat. The route's
      // server fetch will hydrate the full chat including the assistant
      // reply, so we don't need to splice it locally here.
      router.replace(
        `/workspace/${workspaceId}/proposals/chat/${result.chat.id}`,
      );
      return;
    }

    setMessages((prev) => [...prev, result.assistantMessage]);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mention) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionActiveIdx((i) =>
          mentionResults.length === 0
            ? 0
            : (i + 1) % mentionResults.length,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionActiveIdx((i) =>
          mentionResults.length === 0
            ? 0
            : (i - 1 + mentionResults.length) % mentionResults.length,
        );
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Remember this anchor so the onKeyUp/onClick caret-sync handlers
        // don't immediately reopen the popover over the same `@query`.
        dismissedMentionStart.current = mention.start;
        setMention(null);
        setMentionResults([]);
        setMentionActiveIdx(0);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && mentionResults.length > 0) {
        e.preventDefault();
        insertMention(mentionResults[mentionActiveIdx] ?? mentionResults[0]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <section
        ref={containerRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100/80 px-4 py-4 sm:px-6 dark:border-zinc-800/70">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRailOpen(true)}
              aria-label="Show conversations"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                {title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
                {workspaceName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfOpen(true)}
              aria-label="Show PDF panel"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 lg:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {isEmpty ? (
            <EmptyState
              onSuggestion={(s) => {
                setInput(s);
                textareaRef.current?.focus();
              }}
              workspaceName={workspaceName}
            />
          ) : (
            <ul className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-2">
              {messages.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  userInitial={userInitial}
                  userImage={userImage}
                />
              ))}
              {isThinking ? <ThinkingRow /> : null}
              <div ref={messagesEndRef} />
            </ul>
          )}
        </div>

        {errorMessage ? (
          <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-[12px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="px-3 pb-5 pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="relative">
              {mention ? (
                <MentionPopover
                  query={mention.query}
                  results={mentionResults}
                  loading={mentionLoading}
                  activeIndex={mentionActiveIdx}
                  onHover={setMentionActiveIdx}
                  onSelect={insertMention}
                />
              ) : null}
              <div className="flex items-end gap-2 rounded-3xl border border-zinc-200/80 bg-white p-2.5 shadow-[0_4px_24px_-12px_rgba(24,24,27,0.08)] transition-all focus-within:border-zinc-300 focus-within:shadow-[0_8px_28px_-12px_rgba(24,24,27,0.14)] dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:focus-within:border-zinc-700">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleCaretMove}
                  onClick={handleCaretMove}
                  onBlur={() => setMention(null)}
                  placeholder="Message the proposal assistant — type @ to mention a lead or customer…"
                  className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[14px] leading-relaxed text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  aria-label="Send"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-white transition-all enabled:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10.5px] text-zinc-400 dark:text-zinc-500">
              Enter to send · Shift + Enter for newline · @ to mention
            </p>
          </div>
        </form>
      </section>

      {/* PDF preview panel — inline on lg+, slide-in drawer below lg */}
      {isPdfOpen ? (
        <div
          onClick={() => setIsPdfOpen(false)}
          aria-hidden
          className="absolute inset-0 z-30 bg-zinc-900/40 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      <aside
        style={{ ["--pdf-w" as string]: `${pdfWidth}%` }}
        className={cn(
          "shrink-0 flex-col border-l border-zinc-100 bg-zinc-50/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95",
          "absolute inset-y-0 right-0 z-40 w-full max-w-md shadow-2xl shadow-black/30",
          isPdfOpen ? "flex" : "hidden",
          "lg:relative lg:flex lg:max-w-none lg:shadow-none lg:w-[var(--pdf-w)]",
        )}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize PDF panel"
          onMouseDown={startPdfResize}
          onDoubleClick={() => setPdfWidth(40)}
          className="group/resize absolute -left-1 top-0 z-10 hidden h-full w-2 cursor-col-resize lg:block"
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 transition-colors",
              "bg-transparent group-hover/resize:bg-primary/50",
            )}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 lg:hidden dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
              Proposal PDF
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPdfOpen(false)}
            aria-label="Close PDF panel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <ProposalPdfViewer proposal={activeProposal} />
      </aside>
    </>
  );
}

function MessageRow({
  message,
  userInitial,
  userImage,
}: {
  message: SerializedProposalMessage;
  userInitial: string;
  userImage: string | null;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <li className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2.5 text-[14px] leading-relaxed text-zinc-900 dark:bg-zinc-800/70 dark:text-zinc-100">
          <UserMessageContent text={message.content} />
        </div>
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 shrink-0 rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700"
          />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {userInitial}
          </span>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-1 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-100">
        <AssistantMarkdown content={message.content} />
        {message.proposal ? (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11.5px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <FileText className="h-3 w-3" />
            PDF rendered — see preview on the right
          </div>
        ) : null}
      </div>
    </li>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0 marker:text-zinc-400 dark:marker:text-zinc-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0 marker:text-zinc-400 dark:marker:text-zinc-500">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-[18px] font-semibold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-[16px] font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-[14.5px] font-semibold first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-[13.5px] font-semibold first:mt-0">
      {children}
    </h4>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-50">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code
          className={cn(
            "block whitespace-pre text-[12.5px] leading-relaxed",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12.5px] text-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-100"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 last:mb-0 dark:border-zinc-800 dark:bg-zinc-900/60">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-zinc-300 pl-3 text-zinc-600 last:mb-0 dark:border-zinc-700 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-800" />,
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-zinc-200 px-2 py-1.5 text-left font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-100 px-2 py-1.5 align-top text-zinc-700 dark:border-zinc-800/60 dark:text-zinc-300">
      {children}
    </td>
  ),
};

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

function UserMessageContent({ text }: { text: string }) {
  const segments = useMemo(() => splitMentionSegments(text), [text]);
  if (segments.length === 0) return null;
  return (
    <>
      {segments.map((seg, idx) =>
        seg.kind === "text" ? (
          <span key={idx}>{seg.value}</span>
        ) : (
          <span
            key={idx}
            className={cn(
              "mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[12.5px] font-medium align-baseline",
              seg.ref.type === "customer"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
            )}
            title={`${seg.ref.type === "customer" ? "Customer" : "Lead"}: ${seg.ref.name}`}
          >
            @{seg.ref.name}
          </span>
        ),
      )}
    </>
  );
}

function ThinkingRow() {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-center gap-1 pt-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:-0.3s] dark:bg-zinc-500" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:-0.15s] dark:bg-zinc-500" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 dark:bg-zinc-500" />
      </div>
    </li>
  );
}

function EmptyState({
  onSuggestion,
  workspaceName,
}: {
  onSuggestion: (text: string) => void;
  workspaceName: string;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
      <h2 className="text-[28px] font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
        Draft a proposal for {workspaceName}
      </h2>
      <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Describe the client, scope, and budget. Ask the assistant to generate
        the PDF when you&rsquo;re ready.
      </p>

      <div className="mt-10 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestionPrompts.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="rounded-2xl border border-zinc-200/70 bg-white px-4 py-3.5 text-left text-[13px] leading-relaxed text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
