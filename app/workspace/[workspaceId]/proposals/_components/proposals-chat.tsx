"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowUp,
  FileText,
  MessageSquarePlus,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";
import type { ProposalDocument } from "@/lib/proposal-ai";
import {
  deleteProposalChat,
  sendProposalMessage,
} from "../actions";
import ProposalPdfViewer from "./proposal-pdf-viewer";

export type ChatRole = "user" | "assistant";

export type SerializedProposalMessage = {
  id: string;
  role: ChatRole;
  content: string;
  proposal: ProposalDocument | null;
  createdAt: string;
};

export type SerializedProposalChat = {
  id: string;
  workspaceId: string;
  title: string;
  preview: string;
  updatedAt: string;
  createdAt: string;
  messages: SerializedProposalMessage[];
};

type ProposalsChatProps = {
  workspaceId: string;
  conversations: SerializedProposalChat[];
  userImage: string | null;
  userInitial: string;
  workspaceName: string;
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

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function latestProposalIn(
  chat: SerializedProposalChat | null,
): ProposalDocument | null {
  if (!chat) return null;
  for (let i = chat.messages.length - 1; i >= 0; i--) {
    const m = chat.messages[i];
    if (m.role === "assistant" && m.proposal) return m.proposal;
  }
  return null;
}

export default function ProposalsChat({
  workspaceId,
  conversations: initialConversations,
  userImage,
  userInitial,
  workspaceName,
}: ProposalsChatProps) {
  const [conversations, setConversations] = useState<SerializedProposalChat[]>(
    initialConversations,
  );
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfWidth, setPdfWidth] = useState(40);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingPdf = useRef(false);
  const railEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRailEnter = () => {
    if (railLeaveTimerRef.current) {
      clearTimeout(railLeaveTimerRef.current);
      railLeaveTimerRef.current = null;
    }
    if (isRailExpanded) return;
    railEnterTimerRef.current = setTimeout(() => setIsRailExpanded(true), 200);
  };

  const handleRailLeave = () => {
    if (railEnterTimerRef.current) {
      clearTimeout(railEnterTimerRef.current);
      railEnterTimerRef.current = null;
    }
    if (!isRailExpanded) return;
    railLeaveTimerRef.current = setTimeout(() => setIsRailExpanded(false), 350);
  };

  useEffect(() => {
    return () => {
      if (railEnterTimerRef.current) clearTimeout(railEnterTimerRef.current);
      if (railLeaveTimerRef.current) clearTimeout(railLeaveTimerRef.current);
    };
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeProposal = useMemo(() => latestProposalIn(active), [active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, isThinking, activeId]);

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

  function startNewChat() {
    // Don't hit the DB until the user actually sends something.
    setActiveId(null);
    setInput("");
    setErrorMessage(null);
  }

  function handleDelete(id: string) {
    const previous = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      const next = previous.filter((c) => c.id !== id)[0]?.id ?? null;
      setActiveId(next);
    }
    startTransition(async () => {
      const result = await deleteProposalChat(workspaceId, id);
      if (!result.ok) {
        setErrorMessage(result.error);
        setConversations(previous);
      }
    });
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isThinking) return;

    setErrorMessage(null);
    setInput("");
    setIsThinking(true);

    // Optimistic update — if no active chat, create a placeholder so the user
    // sees their message immediately. The server response will replace it.
    const optimisticUserMsg: SerializedProposalMessage = {
      id: makeLocalId(),
      role: "user",
      content: text,
      proposal: null,
      createdAt: new Date().toISOString(),
    };

    const previousActiveId = activeId;
    let optimisticChatId = activeId;
    let snapshot: SerializedProposalChat[] = conversations;

    setConversations((prev) => {
      snapshot = prev;
      if (!previousActiveId) {
        // brand-new chat placeholder until server returns the real id
        const tempId = makeLocalId();
        optimisticChatId = tempId;
        const placeholder: SerializedProposalChat = {
          id: tempId,
          workspaceId,
          title: text.length > 60 ? `${text.slice(0, 60)}…` : text,
          preview: text,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [optimisticUserMsg],
        };
        return [placeholder, ...prev];
      }
      return prev.map((c) =>
        c.id === previousActiveId
          ? {
              ...c,
              preview: text,
              updatedAt: new Date().toISOString(),
              messages: [...c.messages, optimisticUserMsg],
            }
          : c,
      );
    });

    if (!previousActiveId) setActiveId(optimisticChatId);

    const result = await sendProposalMessage(
      workspaceId,
      previousActiveId,
      text,
    );

    setIsThinking(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      // Roll back the optimistic message so the user can retry without dupes.
      setConversations(snapshot);
      if (!previousActiveId) setActiveId(snapshot[0]?.id ?? null);
      setInput(text);
      return;
    }

    // Replace the optimistic chat with the authoritative server chat.
    setConversations((prev) => {
      const without = prev.filter(
        (c) => c.id !== optimisticChatId && c.id !== result.chat.id,
      );
      return [result.chat, ...without];
    });
    setActiveId(result.chat.id);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-white dark:bg-zinc-900"
    >
      {/* Spacer — reserves the rail's collapsed width in the flex layout */}
      <div className="hidden w-14 shrink-0 md:block" aria-hidden />

      {/* Conversations sidebar — absolute overlay so expanding doesn't resize chat */}
      <aside
        data-expanded={isRailExpanded ? "" : undefined}
        onMouseEnter={handleRailEnter}
        onMouseLeave={handleRailLeave}
        className="group/rail absolute left-0 top-0 z-20 hidden h-full w-14 flex-col overflow-hidden border-r border-zinc-100/80 bg-zinc-50/80 backdrop-blur-sm transition-[width,box-shadow] duration-200 ease-out data-[expanded]:w-72 data-[expanded]:shadow-xl data-[expanded]:shadow-zinc-900/5 md:flex dark:border-zinc-800/70 dark:bg-zinc-950/80 dark:data-[expanded]:shadow-black/30"
      >
        <div className="space-y-2 px-2 pb-2 pt-3 group-data-[expanded]/rail:px-3">
          <button
            type="button"
            onClick={startNewChat}
            title="New chat"
            className="group/new inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200/70 bg-white px-2 text-[12.5px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden whitespace-nowrap group-data-[expanded]/rail:inline">
              New chat
            </span>
          </button>

          <div className="relative hidden group-data-[expanded]/rail:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-8 w-full rounded-lg border border-transparent bg-zinc-100/80 pl-8 pr-2.5 text-[12.5px] text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-300 focus:bg-white dark:bg-zinc-900/60 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:bg-zinc-900"
            />
          </div>
        </div>

        <p className="hidden px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 group-data-[expanded]/rail:block dark:text-zinc-500">
          Conversations
        </p>

        <div className="rail-scroll flex-1 overflow-y-auto px-1.5 pb-3 group-data-[expanded]/rail:px-2">
          {filtered.length === 0 ? (
            <div className="mx-2 mt-4 hidden rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-[12px] text-zinc-500 group-data-[expanded]/rail:block dark:border-zinc-800 dark:text-zinc-400">
              {query
                ? "No chats match that search."
                : "No conversations yet. Start one with the button above."}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((convo) => {
                const isActive = convo.id === activeId;
                return (
                  <li key={convo.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(convo.id)}
                      title={convo.title}
                      className={cn(
                        "group/item relative flex w-full items-center justify-center gap-2 rounded-lg px-1.5 py-2 text-left transition-colors group-data-[expanded]/rail:items-center group-data-[expanded]/rail:justify-start group-data-[expanded]/rail:gap-2.5 group-data-[expanded]/rail:px-2.5",
                        isActive
                          ? "bg-zinc-200/60 text-zinc-900 dark:bg-zinc-800/70 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-200/40 dark:text-zinc-400 dark:hover:bg-zinc-800/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors",
                          isActive
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-transparent text-zinc-400 dark:text-zinc-500",
                        )}
                      >
                        <FileText className="h-3 w-3" />
                      </span>
                      <span className="hidden min-w-0 flex-1 group-data-[expanded]/rail:block">
                        <span
                          className={cn(
                            "block truncate text-[12.5px]",
                            isActive ? "font-medium" : "font-normal",
                          )}
                        >
                          {convo.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {convo.preview}
                        </span>
                      </span>
                      <span className="ml-auto hidden shrink-0 items-center gap-1.5 group-data-[expanded]/rail:flex">
                        <span className="text-[10px] text-zinc-400 transition-opacity group-hover/item:opacity-0 dark:text-zinc-500">
                          {formatRelative(convo.updatedAt)}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Delete ${convo.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(convo.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(convo.id);
                            }
                          }}
                          className="absolute right-2 grid h-5 w-5 cursor-pointer place-items-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-300/60 hover:text-rose-500 group-hover/item:opacity-100 dark:hover:bg-zinc-700/60"
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100/80 px-6 py-4 dark:border-zinc-800/70">
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
              {active?.title ?? "New conversation"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-zinc-500 dark:text-zinc-400">
              {workspaceName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white md:hidden"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New
            </button>
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
          {!active || active.messages.length === 0 ? (
            <EmptyState
              onSuggestion={(s) => {
                setInput(s);
                textareaRef.current?.focus();
              }}
              workspaceName={workspaceName}
            />
          ) : (
            <ul className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-2">
              {active.messages.map((m) => (
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

        <form
          onSubmit={handleSubmit}
          className="px-3 pb-5 pt-2 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-zinc-200/80 bg-white p-2.5 shadow-[0_4px_24px_-12px_rgba(24,24,27,0.08)] transition-all focus-within:border-zinc-300 focus-within:shadow-[0_8px_28px_-12px_rgba(24,24,27,0.14)] dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:focus-within:border-zinc-700">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message the proposal assistant…"
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
            <p className="mt-2 text-center text-[10.5px] text-zinc-400 dark:text-zinc-500">
              Enter to send · Shift + Enter for newline
            </p>
          </div>
        </form>
      </section>

      {/* Mobile/tablet drawer backdrop */}
      {isPdfOpen ? (
        <div
          onClick={() => setIsPdfOpen(false)}
          aria-hidden
          className="absolute inset-0 z-30 bg-zinc-900/40 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      {/* PDF preview panel — inline on lg+, slide-in drawer below lg */}
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

        {/* Outer header — only shown in the mobile drawer so the close button stays reachable. */}
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
    </div>
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
          {message.content}
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
  hr: () => (
    <hr className="my-4 border-zinc-200 dark:border-zinc-800" />
  ),
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
