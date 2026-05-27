"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Domain } from "@/lib/content/types";

interface Props {
  projects: Array<{ slug: string; name: string }>;
  domains: Array<{ slug: Domain; title: string }>;
}

interface AskResponse {
  answer?: string;
  reasoning?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
  contextSummary?: { projectsCount: number; indicatorsCount: number; evidenceCount: number };
  error?: string;
}

interface Turn {
  id: number;
  question: string;
  projectSlug: string;
  domainSlug: string;
  reasoning: boolean;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  response?: AskResponse;
}

const QUICK_PROMPTS = [
  "Summarize the Yahey v BC decision in three sentences",
  "What are the open questions on the Cascade 6-Nations partnership?",
  "Compare Enbridge and TC Energy on Indigenous-equity participation",
  "What does the NRTA mean for new Alberta water-licence applications?",
  "List the top three risks for the Cedar LNG project",
];

export function AskForm({ projects, domains }: Props) {
  const [cmd, setCmd] = useState("");
  const [projectSlug, setProjectSlug] = useState<string>("");
  const [domainSlug, setDomainSlug] = useState<string>("");
  const [includeReasoning, setIncludeReasoning] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, startTransition] = useTransition();
  const [clock, setClock] = useState(() => new Date());
  const turnCounter = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Tick clock for status bar
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll transcript when new turns or responses arrive
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turns]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lastModel = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].response?.model) return turns[i].response!.model!;
    }
    return "treaty";
  }, [turns]);

  function submit(text?: string) {
    const question = (text ?? cmd).trim();
    if (!question || pending) return;

    const id = ++turnCounter.current;
    const projectSlugAtSubmit = projectSlug;
    const domainSlugAtSubmit = domainSlug;
    const reasoningAtSubmit = includeReasoning;
    const startedAt = new Date();

    const newTurn: Turn = {
      id,
      question,
      projectSlug: projectSlugAtSubmit,
      domainSlug: domainSlugAtSubmit,
      reasoning: reasoningAtSubmit,
      startedAt,
    };
    setTurns((t) => [...t, newTurn]);
    setCmd("");

    startTransition(async () => {
      let response: AskResponse;
      try {
        const r = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            context:
              projectSlugAtSubmit || domainSlugAtSubmit
                ? {
                    ...(projectSlugAtSubmit ? { projectSlug: projectSlugAtSubmit } : {}),
                    ...(domainSlugAtSubmit ? { domain: domainSlugAtSubmit as Domain } : {}),
                  }
                : undefined,
            reasoning: reasoningAtSubmit,
          }),
        });
        response = (await r.json()) as AskResponse;
      } catch (e) {
        response = { error: e instanceof Error ? e.message : String(e) };
      }
      const finishedAt = new Date();
      setTurns((t) =>
        t.map((tt) =>
          tt.id === id
            ? { ...tt, response, finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime() }
            : tt,
        ),
      );
      // refocus input for next question
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }

  function clearTranscript() {
    setTurns([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const projectLabel = projectSlug
    ? projects.find((p) => p.slug === projectSlug)?.name ?? projectSlug
    : "—";
  const domainLabel = domainSlug
    ? domains.find((d) => d.slug === domainSlug)?.title ?? domainSlug
    : "—";

  const totalTokens = turns.reduce((acc, t) => acc + (t.response?.usage?.total_tokens ?? 0), 0);

  return (
    <div className="border border-zinc-800 bg-[#0a0e10] text-zinc-300 font-mono shadow-2xl">
      {/* ─── Top status bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-[#06090a] px-4 py-1.5 text-[10px] tracking-[0.2em] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">●</span>
          <span>TREATY-LAB · ANALYST CONSOLE</span>
        </div>
        <div className="flex items-center gap-4">
          <span>MODEL · <span className="text-emerald-300">{lastModel}</span></span>
          <span className="text-zinc-700">│</span>
          <span>CTX · P:<span className={projectSlug ? "text-emerald-300" : "text-zinc-600"}>{projectSlug ? "1" : "0"}</span> D:<span className={domainSlug ? "text-emerald-300" : "text-zinc-600"}>{domainSlug ? "1" : "0"}</span></span>
          <span className="text-zinc-700">│</span>
          <span>{clock.toISOString().slice(11, 19)}Z</span>
        </div>
      </div>

      {/* ─── Context selectors ──────────────────────────────────────────── */}
      <div className="grid grid-cols-12 border-b border-zinc-800 bg-[#080b0d] px-4 py-2 gap-3 text-[11px]">
        <div className="col-span-12 md:col-span-5">
          <div className="text-[9px] tracking-[0.2em] text-zinc-500 mb-1">PROJECT CONTEXT</div>
          <select
            value={projectSlug}
            onChange={(e) => setProjectSlug(e.target.value)}
            disabled={pending}
            className="w-full h-7 bg-[#06090a] border border-zinc-800 text-zinc-200 px-2 text-[11px] focus:border-emerald-400/50 focus:outline-none disabled:opacity-50"
          >
            <option value="">— none —</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 md:col-span-5">
          <div className="text-[9px] tracking-[0.2em] text-zinc-500 mb-1">DOMAIN CONTEXT</div>
          <select
            value={domainSlug}
            onChange={(e) => setDomainSlug(e.target.value)}
            disabled={pending}
            className="w-full h-7 bg-[#06090a] border border-zinc-800 text-zinc-200 px-2 text-[11px] focus:border-emerald-400/50 focus:outline-none disabled:opacity-50"
          >
            <option value="">— none —</option>
            {domains.map((d) => (
              <option key={d.slug} value={d.slug}>{d.title}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 md:col-span-2 flex flex-col">
          <div className="text-[9px] tracking-[0.2em] text-zinc-500 mb-1">REASONING</div>
          <button
            type="button"
            onClick={() => setIncludeReasoning((v) => !v)}
            disabled={pending}
            className={`h-7 px-2 text-[11px] tracking-wide border transition ${
              includeReasoning
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-zinc-800 bg-[#06090a] text-zinc-500 hover:border-zinc-700"
            }`}
          >
            {includeReasoning ? "TRACE · ON" : "TRACE · OFF"}
          </button>
        </div>
      </div>

      {/* ─── Transcript ──────────────────────────────────────────────────── */}
      <div
        ref={transcriptRef}
        className="min-h-[420px] max-h-[60vh] overflow-y-auto bg-[#070a0c] px-4 py-3 text-[12px] leading-relaxed"
      >
        {turns.length === 0 && (
          <div className="text-zinc-600 space-y-1">
            <div>[BOOT] treaty-lab · analyst console ready</div>
            <div>[BOOT] live LLM backend: databricks ai-gateway → treaty (gpt-oss-120b)</div>
            <div>[BOOT] context: {projects.length} projects · {domains.length} domains indexed</div>
            <div className="text-zinc-700">─ type a question below, or click a quick prompt to start ─</div>
          </div>
        )}
        {turns.map((t) => (
          <TurnView key={t.id} turn={t} projects={projects} domains={domains} />
        ))}
        {pending && turns.length > 0 && !turns[turns.length - 1].response && (
          <div className="mt-2 text-amber-300/80 text-[11px] animate-pulse">
            … awaiting gateway response (5-20s typical for reasoning model)
          </div>
        )}
      </div>

      {/* ─── Input ───────────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-800 bg-[#06090a] px-4 py-3">
        <div className="flex items-start gap-2 border border-emerald-500/30 bg-[#04070880] px-2 py-1.5">
          <span className={`text-lg leading-none mt-0.5 ${pending ? "text-amber-300 animate-pulse" : "text-emerald-300"}`}>▸</span>
          <textarea
            ref={inputRef}
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={pending ? "waiting on gateway…" : "ask a question — Enter to send, Shift+Enter for newline"}
            disabled={pending}
            className="flex-1 bg-transparent text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => submit()}
              disabled={pending || !cmd.trim()}
              className="border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] tracking-wide text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {pending ? "WAIT…" : "SEND ⏎"}
            </button>
            <button
              onClick={clearTranscript}
              disabled={pending || turns.length === 0}
              className="border border-zinc-800 bg-transparent px-2.5 py-1 text-[10px] tracking-wide text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              CLEAR
            </button>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="mt-2.5">
          <div className="text-[9px] tracking-[0.2em] text-zinc-500 mb-1">QUICK PROMPTS</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                disabled={pending}
                className="border border-zinc-800 bg-[#0a0f11] px-2 py-0.5 text-[10px] text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-200 disabled:opacity-40 transition text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bottom status bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-zinc-900 bg-[#04070a] px-4 py-1 text-[10px] tracking-[0.18em] text-zinc-500">
        <div className="flex items-center gap-4">
          <span>TURNS · <span className="text-emerald-300">{turns.length}</span></span>
          <span className="text-zinc-700">│</span>
          <span>TOKENS · <span className="text-emerald-300">{totalTokens}</span></span>
          <span className="text-zinc-700">│</span>
          <span>STATE · <span className={pending ? "text-amber-300" : "text-emerald-300"}>{pending ? "PENDING" : "READY"}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">PROJ · <span className="text-zinc-300 normal-case tracking-normal">{projectLabel}</span></span>
          <span className="text-zinc-700 hidden md:inline">│</span>
          <span className="hidden md:inline">DOM · <span className="text-zinc-300 normal-case tracking-normal">{domainLabel}</span></span>
          <span className="text-zinc-700">│</span>
          <span>HOST · databricks-ai-gateway</span>
        </div>
      </div>
    </div>
  );
}

// ─── Turn renderer ────────────────────────────────────────────────────────

function TurnView({
  turn,
  projects,
  domains,
}: {
  turn: Turn;
  projects: Array<{ slug: string; name: string }>;
  domains: Array<{ slug: Domain; title: string }>;
}) {
  const ts = turn.startedAt.toISOString().slice(11, 19);
  const projectName = turn.projectSlug
    ? projects.find((p) => p.slug === turn.projectSlug)?.name ?? turn.projectSlug
    : null;
  const domainName = turn.domainSlug
    ? domains.find((d) => d.slug === turn.domainSlug)?.title ?? turn.domainSlug
    : null;

  return (
    <div className="mb-5 last:mb-1">
      {/* User question line */}
      <div className="flex items-baseline gap-2">
        <span className="text-zinc-600 text-[10px]">{ts}</span>
        <span className="text-emerald-400">&gt;</span>
        <span className="text-zinc-100 whitespace-pre-wrap flex-1">{turn.question}</span>
      </div>
      {/* Context badges under question */}
      {(projectName || domainName || turn.reasoning) && (
        <div className="ml-12 mt-1 flex flex-wrap gap-1.5 text-[9px] tracking-[0.15em] text-zinc-500">
          {projectName && (
            <span className="border border-zinc-800 bg-[#0a0f11] px-1.5 py-px">PROJ · {projectName}</span>
          )}
          {domainName && (
            <span className="border border-zinc-800 bg-[#0a0f11] px-1.5 py-px">DOM · {domainName}</span>
          )}
          {turn.reasoning && (
            <span className="border border-amber-500/30 bg-amber-500/5 text-amber-300 px-1.5 py-px">TRACE</span>
          )}
        </div>
      )}

      {/* Pending state */}
      {!turn.response && (
        <div className="ml-12 mt-2 text-amber-300/70 text-[11px] animate-pulse">
          … treaty model thinking
        </div>
      )}

      {/* Response */}
      {turn.response && (
        <div className="ml-6 mt-2 border-l-2 border-emerald-500/30 pl-4">
          {turn.response.error && (
            <div className="text-rose-300 text-[11px] border border-rose-700/50 bg-rose-900/20 px-2 py-1.5">
              <div className="text-[9px] tracking-[0.2em] text-rose-400 mb-1">ERROR</div>
              {turn.response.error}
            </div>
          )}

          {turn.response.answer && (
            <div className="text-zinc-200 text-[12px] leading-relaxed markdown-body">
              <MarkdownAnswer text={turn.response.answer} />
            </div>
          )}

          {turn.response.reasoning && (
            <details className="mt-3 border border-amber-500/20 bg-amber-500/[0.03]">
              <summary className="cursor-pointer px-2 py-1 text-[10px] tracking-[0.2em] text-amber-300/80 hover:text-amber-200">
                ▾ REASONING TRACE
              </summary>
              <div className="px-3 py-2 text-[11px] leading-relaxed text-amber-100/70 whitespace-pre-wrap border-t border-amber-500/20">
                {turn.response.reasoning}
              </div>
            </details>
          )}

          {/* Usage line */}
          <div className="mt-2 flex flex-wrap gap-3 text-[9px] tracking-[0.15em] text-zinc-600">
            {turn.response.usage && (
              <>
                <span>IN · {turn.response.usage.prompt_tokens ?? "—"}</span>
                <span>OUT · {turn.response.usage.completion_tokens ?? "—"}</span>
                <span>TOTAL · {turn.response.usage.total_tokens ?? "—"}</span>
              </>
            )}
            {turn.response.contextSummary && (
              <span>
                CTX · {turn.response.contextSummary.projectsCount}p / {turn.response.contextSummary.indicatorsCount}i /{" "}
                {turn.response.contextSummary.evidenceCount}e
              </span>
            )}
            {turn.durationMs != null && (
              <span>DT · {(turn.durationMs / 1000).toFixed(1)}s</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Markdown renderer with terminal styling ──────────────────────────────

function MarkdownAnswer({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => (
          <h1 className="mt-3 mb-2 text-[13px] font-semibold tracking-wide text-emerald-200 uppercase">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-3 mb-1.5 text-[12px] font-semibold tracking-wide text-emerald-200 uppercase">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-2.5 mb-1 text-[11px] font-semibold tracking-[0.15em] text-emerald-300/90 uppercase">
            {children}
          </h3>
        ),
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc marker:text-emerald-500/60 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal marker:text-emerald-500/60 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-zinc-200">{children}</li>,
        strong: ({ children }) => <strong className="text-emerald-200 font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-amber-200/90 not-italic">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block my-2 border border-zinc-800 bg-[#04070a] px-2 py-1.5 text-[11px] text-emerald-200 overflow-x-auto whitespace-pre">
                {children}
              </code>
            );
          }
          return (
            <code className="border border-zinc-800 bg-[#04070a] px-1 py-px text-[11px] text-emerald-200">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-2 border border-zinc-800 bg-[#04070a] p-2 text-[11px] overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-amber-500/40 pl-3 text-amber-100/70 italic">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-300/30 hover:decoration-cyan-300">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="min-w-full border border-zinc-800 text-[11px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#080b0d]">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-zinc-800 px-2 py-1 text-left text-[10px] tracking-[0.15em] text-emerald-300/80 uppercase">
            {children}
          </th>
        ),
        td: ({ children }) => <td className="border border-zinc-800 px-2 py-1 text-zinc-200">{children}</td>,
        hr: () => <hr className="my-3 border-zinc-800" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
