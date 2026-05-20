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
  const [, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingPdf = useRef(false);

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
      <aside className="group/rail absolute left-0 top-0 z-20 hidden h-full w-14 flex-col overflow-hidden border-r border-zinc-100 bg-zinc-50/95 backdrop-blur-sm transition-[width,box-shadow] duration-200 ease-out hover:w-72 hover:shadow-xl hover:shadow-zinc-900/10 md:flex dark:border-zinc-800 dark:bg-zinc-950/90 dark:hover:shadow-black/40">
        <div className="space-y-3 px-2 pb-2 pt-3 group-hover/rail:px-3">
          <button
            type="button"
            onClick={startNewChat}
            title="New chat"
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary px-2 text-[12.5px] font-medium text-white shadow-sm shadow-primary/30 transition-all hover:shadow-md hover:shadow-primary/40"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden whitespace-nowrap group-hover/rail:inline">
              New chat
            </span>
          </button>

          <div className="relative hidden group-hover/rail:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-2.5 text-[12.5px] text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="rail-scroll flex-1 overflow-y-auto px-1.5 pb-3 group-hover/rail:px-2">
          {filtered.length === 0 ? (
            <div className="mx-2 mt-4 hidden rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-[12px] text-zinc-500 group-hover/rail:block dark:border-zinc-800 dark:text-zinc-400">
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
                        "group/item relative flex w-full items-center justify-center gap-2 rounded-lg px-1.5 py-2 text-left transition-colors group-hover/rail:items-start group-hover/rail:justify-start group-hover/rail:px-2.5",
                        isActive
                          ? "bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                          : "hover:bg-white/70 dark:hover:bg-zinc-900/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md group-hover/rail:mt-0.5",
                          isActive
                            ? "bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30"
                            : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                        )}
                      >
                        <FileText className="h-3 w-3" />
                      </span>
                      <span className="hidden min-w-0 flex-1 group-hover/rail:block">
                        <span className="block truncate text-[12.5px] font-medium text-zinc-800 dark:text-zinc-100">
                          {convo.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {convo.preview}
                        </span>
                      </span>
                      <span className="ml-auto hidden shrink-0 flex-col items-end gap-1 group-hover/rail:flex">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
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
                          className="grid h-5 w-5 cursor-pointer place-items-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-rose-500 group-hover/item:opacity-100 dark:hover:bg-zinc-800"
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

        <div className="hidden border-t border-zinc-100 px-3 py-2.5 text-[10.5px] text-zinc-400 group-hover/rail:block dark:border-zinc-800 dark:text-zinc-500">
          Chats sync to your workspace
        </div>
      </aside>

      {/* Main chat */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                {active?.title ?? "Start a new conversation"}
              </p>
              <p className="line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Drafting assistant for {workspaceName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white md:hidden"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New
            </button>
            <button
              type="button"
              onClick={() => setIsPdfOpen(true)}
              aria-label="Show PDF panel"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 lg:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white"
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
            <ul className="mx-auto flex w-full max-w-3xl flex-col gap-4">
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
          className="border-t border-zinc-100 px-3 pb-3 pt-3 dark:border-zinc-800 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 dark:border-zinc-800 dark:bg-zinc-950/40">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the proposal you want to draft…"
                className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] leading-relaxed text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                aria-label="Send"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/30 transition-all enabled:hover:shadow-md enabled:hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10.5px] text-zinc-400 dark:text-zinc-500">
              Press Enter to send · Shift + Enter for newline · Ask &ldquo;generate the proposal PDF&rdquo; when ready
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
  return (
    <li
      className={cn(
        "flex items-start gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {isUser ? (
        userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 shrink-0 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-700"
          />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {userInitial}
          </span>
        )
      ) : (
        <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/20">
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
          />
          <Sparkles className="relative h-3.5 w-3.5" />
        </span>
      )}

      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/25"
            : "rounded-tl-sm border border-zinc-100 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100",
        )}
      >
        {message.content}
        {message.proposal ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/95 ring-1 ring-white/20 backdrop-blur dark:bg-zinc-900/40 dark:text-zinc-100">
            <FileText className="h-3 w-3" />
            PDF rendered — see preview on the right
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ThinkingRow() {
  return (
    <li className="flex items-start gap-2.5">
      <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm shadow-primary/20">
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
        />
        <Sparkles className="relative h-3.5 w-3.5" />
      </span>
      <div className="rounded-2xl rounded-tl-sm border border-zinc-100 bg-zinc-50 px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-950/60">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:-0.3s] dark:bg-zinc-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:-0.15s] dark:bg-zinc-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 dark:bg-zinc-500" />
        </span>
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
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-2 py-6 text-center">
      <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/30">
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"
        />
        <Sparkles className="relative h-6 w-6" />
      </span>
      <h2 className="mt-4 text-[18px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Draft a proposal for {workspaceName}
      </h2>
      <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Describe the client, scope, and budget. When you&rsquo;re ready, ask the
        assistant to <em>generate the proposal PDF</em> and it&rsquo;ll render
        in the panel on the right.
      </p>

      <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestionPrompts.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="group rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-[12.5px] text-zinc-700 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
          >
            <span className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{s}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
