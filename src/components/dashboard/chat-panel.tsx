"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, X, Send, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  /** Final rendered content (for assistant: markdown). */
  content: string;
  /** Streaming thoughts (assistant only). Latest line shown as live status. */
  thoughts: string;
  /** True while this message is still streaming. */
  pending: boolean;
  /** Model name the gateway routed to. */
  model?: string;
  /** Error if the stream failed. */
  error?: string;
}

type StreamEvent =
  | { type: "thought"; text: string }
  | { type: "content"; text: string }
  | { type: "model"; model: string }
  | {
      type: "usage";
      usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    }
  | { type: "done" }
  | { type: "error"; error: string };

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Autosize textarea
  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 240)}px`;
  }, [input]);

  // Stop in-flight stream when panel closes
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setBusy(false);
    }
  }, [open]);

  const conversation = useMemo(
    () =>
      messages
        .filter((m) => !m.error && (m.role === "user" || (m.role === "assistant" && m.content)))
        .map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
        thoughts: "",
        pending: false,
      };
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: "",
        thoughts: "",
        pending: true,
      };

      const priorConversation = conversation.slice();
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const resp = await fetch("/api/ask/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...priorConversation, { role: "user" as const, content: trimmed }],
          }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          // Prefer the JSON `error` message (e.g. 401 / 429 rate limit) over raw body text.
          let text = `HTTP ${resp.status}`;
          if (!resp.ok) {
            const raw = await resp.text().catch(() => "");
            try {
              text = (JSON.parse(raw) as { error?: string }).error ?? raw ?? text;
            } catch {
              text = raw || text;
            }
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false, error: text } : m)),
          );
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of block.split("\n")) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith("data:")) continue;
              const payload = trimmedLine.slice(5).trim();
              if (!payload) continue;
              let ev: StreamEvent;
              try {
                ev = JSON.parse(payload) as StreamEvent;
              } catch {
                continue;
              }
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsg.id) return m;
                  switch (ev.type) {
                    case "thought":
                      return { ...m, thoughts: m.thoughts + ev.text };
                    case "content":
                      return { ...m, content: m.content + ev.text };
                    case "model":
                      return { ...m, model: ev.model };
                    case "error":
                      return { ...m, pending: false, error: ev.error };
                    case "done":
                      return { ...m, pending: false };
                    default:
                      return m;
                  }
                }),
              );
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false } : m)),
        );
      } catch (err) {
        if (controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, pending: false, error: "Cancelled" } : m,
            ),
          );
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, pending: false, error: msg } : m)),
          );
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, conversation],
  );

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <>
      {/* Floating toggle — always reachable */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open analyst chat"
          className="fixed z-40 bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 py-2.5 text-sm font-medium shadow-lg transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Ask analyst
        </button>
      )}

      {/* Slide-in panel. `inert` when closed hides it from the a11y tree AND
          removes its focusable contents from the tab order (fixes the
          aria-hidden-focus violation that plain aria-hidden left behind). */}
      <aside
        inert={!open}
        className={cn(
          "fixed z-50 top-0 right-0 h-full w-full sm:w-[520px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-0.5">
              ANALYST CHAT · TREATY MODEL
            </div>
            <h3 className="font-semibold text-sm text-foreground leading-tight">Analyst Q&amp;A</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                aria-label="Reset conversation"
                className="p-1.5 rounded-sm hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-sm hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground pt-12 px-6 leading-relaxed">
              Ask a question grounded in the platform&apos;s evidence library — treaty rights,
              project assessments, indicators. The model separates facts from risks, questions,
              assumptions, and items needing validation. Press{" "}
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded-sm bg-muted/60 border border-border">
                Enter
              </kbd>{" "}
              to send,{" "}
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded-sm bg-muted/60 border border-border">
                Shift+Enter
              </kbd>{" "}
              for a new line.
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about a treaty, project, indicator…"
              disabled={busy}
              className="flex-1 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-colors disabled:opacity-60 max-h-60"
            />
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted/60 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground/70 mt-1.5">
            NOT INVESTMENT ADVICE · NOT LEGAL ADVICE · Research synthesis only.
          </div>
        </div>
      </aside>
    </>
  );
}

function MessageBubble({ message: m }: { message: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-sky-500/15 border border-sky-500/30 px-3 py-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {m.content}
        </div>
      </div>
    );
  }
  // Last line of thoughts shown as live status while streaming
  const lastThoughtLine =
    m.thoughts
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-1)[0] ?? "";
  return (
    <div className="space-y-1.5">
      {(m.pending || m.thoughts) && lastThoughtLine && (
        <div className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
          {m.pending && <Loader2 className="w-3 h-3 animate-spin" />}
          <span className="truncate">{lastThoughtLine}</span>
        </div>
      )}
      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-foreground/95 leading-relaxed">
        {m.content && (
          <div
            className={cn(
              "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
              "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5",
              "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1",
              "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-foreground",
              "[&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-1.5",
              "[&_li]:my-0.5",
              "[&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-sm",
              "[&_pre]:font-mono [&_pre]:text-[12px] [&_pre]:bg-background/60 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:my-2 [&_pre]:overflow-x-auto",
              "[&_pre>code]:bg-transparent [&_pre>code]:p-0",
              "[&_a]:text-sky-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-sky-300",
              "[&_strong]:text-foreground [&_strong]:font-semibold",
              "[&_em]:italic",
              "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2",
              "[&_table]:w-full [&_table]:my-2 [&_table]:text-xs [&_table]:border-collapse",
              "[&_th]:text-left [&_th]:font-medium [&_th]:px-2 [&_th]:py-1 [&_th]:border-b [&_th]:border-border",
              "[&_td]:px-2 [&_td]:py-1 [&_td]:border-b [&_td]:border-border/40",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </div>
        )}
        {!m.content && m.pending && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating…
          </div>
        )}
        {m.error && (
          <div className="mt-1 text-xs text-rose-300 leading-relaxed">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase mr-1.5">Error</span>
            {m.error}
          </div>
        )}
      </div>
      {m.thoughts && !m.pending && (
        <details className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
          <summary className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground cursor-pointer">
            REASONING TRACE
          </summary>
          <div className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap mt-2">
            {m.thoughts}
          </div>
        </details>
      )}
      {m.model && !m.pending && (
        <div className="font-mono text-[10px] text-muted-foreground/70">model: {m.model}</div>
      )}
    </div>
  );
}
