"use client";

import { useState } from "react";
import { USER_ROLES, type UserRole, type DecisionQuestion } from "@/lib/llm/question-generator";

interface Props {
  projectSlug: string;
  projectName: string;
}

interface QuestionsResponse {
  questionsMarkdown?: string;
  questions?: DecisionQuestion[];
  role?: string;
  count?: number;
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

export function DecisionQuestionsForm({ projectSlug, projectName }: Props) {
  const [role, setRole] = useState<UserRole>("community");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionsResponse | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug, role }),
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reader role">
        {ROLE_ORDER.map((r) => {
          const active = r === role;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => setRole(r)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {USER_ROLES[r].label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
        <span className="text-foreground">Lens:</span> {USER_ROLES[role].lens}.
      </p>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-foreground/40 disabled:opacity-50"
      >
        {loading
          ? "Generating…"
          : `Generate questions for a ${USER_ROLES[role].label.toLowerCase()}`}
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
          <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            {result.questions?.length ?? 0} QUESTIONS · {USER_ROLES[role].label.toUpperCase()}
            {result.contextSummary ? ` · ${result.contextSummary.openItemsCount} OPEN ITEMS` : ""}
            {result.model ? ` · ${result.model}` : ""}
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
