"use client";

import { useState } from "react";
import {
  USER_ROLES,
  DOMAIN_LABELS,
  parseDecisionQuestions,
  type UserRole,
  type DecisionQuestion,
} from "@/lib/llm/question-generator";
import type { Domain } from "@/lib/content/types";

interface Props {
  projectSlug: string;
  projectName: string;
  /** AI-006: the project's relevant domains, offered as focus chips. */
  domains: Domain[];
}

/** SSE event shape (matches src/lib/llm StreamEvent). */
type StreamEvent =
  | { type: "content"; text: string }
  | { type: "thought"; text: string }
  | { type: "model"; model: string }
  | { type: "usage"; usage?: unknown }
  | { type: "error"; error: string }
  | { type: "done" };

// Community / leadership / advisor first — the audiences the platform is built
// for — then the specialist reviewers.
const ROLE_ORDER: UserRole[] = [
  "community",
  "leadership",
  "advisor",
  "analyst",
  "legal",
  "finance_reviewer",
];

const COUNT_OPTIONS = [5, 10, 15, 20];

function chipClass(active: boolean, sm = false): string {
  const size = sm ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return `rounded-md border ${size} transition-colors ${
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
  }`;
}

function questionsToMarkdown(
  qs: DecisionQuestion[],
  projectName: string,
  roleLabel: string,
  focusLabel: string | null,
): string {
  const header = [
    `# Decision questions — ${projectName}`,
    `_Role: ${roleLabel}${focusLabel ? ` · Focus: ${focusLabel}` : ""}_`,
    "",
  ];
  const body = qs.map((q, i) => {
    const parts = [`${i + 1}. ${q.question}`];
    if (q.why) parts.push(`   - Why: ${q.why}`);
    if (q.evidenceSlugs.length) parts.push(`   - Sources: ${q.evidenceSlugs.join(", ")}`);
    return parts.join("\n");
  });
  return [...header, ...body].join("\n");
}

export function DecisionQuestionsForm({ projectSlug, projectName, domains }: Props) {
  const [role, setRole] = useState<UserRole>("community");
  const [count, setCount] = useState(10);
  const [focus, setFocus] = useState<Domain | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DecisionQuestion[]>([]);
  const [rawText, setRawText] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setStreaming(true);
    setStarted(true);
    setError(null);
    setQuestions([]);
    setRawText("");
    setModel(null);
    setCopied(false);

    try {
      const res = await fetch("/api/questions/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug, role, count, ...(focus ? { focus } : {}) }),
      });

      if (!res.ok || !res.body) {
        let msg = `Request failed (${res.status})`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          // non-JSON error body
        }
        setError(msg);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          let ev: StreamEvent;
          try {
            ev = JSON.parse(dataLine.slice(5).trim()) as StreamEvent;
          } catch {
            continue;
          }
          if (ev.type === "content") {
            acc += ev.text;
            setRawText(acc);
            setQuestions(parseDecisionQuestions(acc));
          } else if (ev.type === "model") {
            setModel(ev.model);
          } else if (ev.type === "error") {
            setError(ev.error);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
    }
  }

  async function copyMarkdown() {
    const md =
      questions.length > 0
        ? questionsToMarkdown(
            questions,
            projectName,
            USER_ROLES[role].label,
            focus ? DOMAIN_LABELS[focus] : null,
          )
        : rawText;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  const showResults = started && (streaming || questions.length > 0 || rawText.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reader role">
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={r === role}
            onClick={() => setRole(r)}
            className={chipClass(r === role)}
          >
            {USER_ROLES[r].label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
        <span className="text-foreground">Lens:</span> {USER_ROLES[role].lens}.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3">
        {domains.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Focus dimension">
            <span className="text-xs text-muted-foreground">Focus</span>
            <button
              type="button"
              aria-pressed={focus === null}
              onClick={() => setFocus(null)}
              className={chipClass(focus === null, true)}
            >
              All
            </button>
            {domains.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={focus === d}
                onClick={() => setFocus(d)}
                className={chipClass(focus === d, true)}
              >
                {DOMAIN_LABELS[d]}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2" role="group" aria-label="Number of questions">
          <span className="text-xs text-muted-foreground">Count</span>
          {COUNT_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === count}
              onClick={() => setCount(c)}
              className={chipClass(c === count, true)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={streaming}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-foreground/40 disabled:opacity-50"
      >
        {streaming
          ? "Generating…"
          : `Generate ${count} questions for a ${USER_ROLES[role].label.toLowerCase()}`}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error === "Authentication required." ? "Sign in to generate questions." : error}
        </div>
      )}

      {showResults && (
        <section className="space-y-4" aria-busy={streaming}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
              {questions.length} QUESTIONS · {USER_ROLES[role].label.toUpperCase()}
              {focus ? ` · FOCUS: ${focus.toUpperCase()}` : ""}
              {model ? ` · ${model}` : ""}
              {streaming ? " · STREAMING…" : ""}
            </div>
            <button
              type="button"
              onClick={copyMarkdown}
              disabled={streaming || (questions.length === 0 && rawText.length === 0)}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-foreground/40 disabled:opacity-40"
            >
              {copied ? "Copied ✓" : "Copy as Markdown"}
            </button>
          </div>

          {questions.length > 0 ? (
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={i} className="rounded-md border border-border bg-card/40 px-4 py-3">
                  <div className="text-sm font-medium leading-relaxed">
                    <span className="text-muted-foreground mr-1.5 font-mono text-xs">{i + 1}.</span>
                    {q.question}
                  </div>
                  {q.why && (
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{q.why}</div>
                  )}
                  {q.evidenceSlugs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.evidenceSlugs.map((s) => (
                        <a
                          key={s}
                          href={`/evidence/${s}`}
                          className="font-mono text-[10px] rounded border border-border px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                        >
                          {s}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            // No structured items parsed yet — show streamed text (or a hint).
            <div className="rounded-md border border-border bg-card/40 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {rawText || (streaming ? "Generating…" : "")}
            </div>
          )}

          {!streaming && questions.length > 0 && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Generated for {projectName}. Treat as prompts for review, not answers — confirm each
              against the cited evidence.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
