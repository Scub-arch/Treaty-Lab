"use client";

import { useState } from "react";
import {
  USER_ROLES,
  DOMAIN_LABELS,
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

interface QuestionsResponse {
  questionsMarkdown?: string;
  questions?: DecisionQuestion[];
  role?: string;
  count?: number;
  focus?: string | null;
  model?: string;
  contextSummary?: { claimsCount: number; openItemsCount: number; evidenceCount: number };
  error?: string;
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionsResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug, role, count, ...(focus ? { focus } : {}) }),
      });
      const data = (await res.json()) as QuestionsResponse;
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!result) return;
    const md =
      result.questions && result.questions.length > 0
        ? questionsToMarkdown(
            result.questions,
            projectName,
            USER_ROLES[role].label,
            focus ? DOMAIN_LABELS[focus] : null,
          )
        : (result.questionsMarkdown ?? "");
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

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
        disabled={loading}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-foreground/40 disabled:opacity-50"
      >
        {loading
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

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
              {result.questions?.length ?? 0} QUESTIONS · {USER_ROLES[role].label.toUpperCase()}
              {result.focus ? ` · FOCUS: ${result.focus.toUpperCase()}` : ""}
              {result.contextSummary ? ` · ${result.contextSummary.openItemsCount} OPEN ITEMS` : ""}
              {result.model ? ` · ${result.model}` : ""}
            </div>
            <button
              type="button"
              onClick={copyMarkdown}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-foreground/40"
            >
              {copied ? "Copied ✓" : "Copy as Markdown"}
            </button>
          </div>

          {result.questions && result.questions.length > 0 ? (
            <ol className="space-y-3">
              {result.questions.map((q, i) => (
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
            // Parser found no structured items — fall back to the raw model output.
            <div className="rounded-md border border-border bg-card/40 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {result.questionsMarkdown}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Generated for {projectName}. Treat as prompts for review, not answers — confirm each
            against the cited evidence.
          </p>
        </section>
      )}
    </div>
  );
}
