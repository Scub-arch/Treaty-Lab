/**
 * AI-005 — Decision-question generator.
 *
 * North Star §10 item 8: "given a project + a user role, produce the next
 * questions that should be asked before approval, partnership, financing, or
 * opposition." This module is the pure core — role definitions, the system
 * prompt, the user-message builder, and an output parser. It does NOT call the
 * gateway or read content (the /api/questions route wires those in), so it has
 * no I/O dependencies and is unit-testable in isolation.
 *
 * The product thesis is decision support, so the output is deliberately the
 * *questions a reader should ask*, not answers or recommendations — and it
 * honours the North Star safe-wording standard (§8): never present inference as
 * fact, never give legal or investment advice.
 */

/** The decision-maker the questions are written for (North Star §3 audiences). */
export type UserRole =
  | "community"
  | "analyst"
  | "leadership"
  | "advisor"
  | "legal"
  | "finance_reviewer";

export interface UserRoleInfo {
  role: UserRole;
  /** Human label for UI selectors. */
  label: string;
  /** What this reader needs the questions to surface. */
  lens: string;
  /** When true, questions must be readable by a non-specialist (§7). */
  plainLanguage: boolean;
}

/** Registry of supported roles. Keep in sync with North Star §3. */
export const USER_ROLES: Record<UserRole, UserRoleInfo> = {
  community: {
    role: "community",
    label: "Community member",
    lens:
      "what is at stake for the community in plain terms, and what they should ask their leadership, advisors, and counsel before a decision is made",
    plainLanguage: true,
  },
  analyst: {
    role: "analyst",
    label: "Analyst / researcher",
    lens:
      "evidentiary rigour — which claims are solid, which are weak or contested, and which source gaps must be closed before a briefing can be relied on",
    plainLanguage: false,
  },
  leadership: {
    role: "leadership",
    label: "Chief & Council / leadership",
    lens:
      "the decision itself — the trade-offs, accountabilities, and unresolved items that must be settled before approving, opposing, partnering on, or financing the project",
    plainLanguage: true,
  },
  advisor: {
    role: "advisor",
    label: "Advisor / EDC / liaison",
    lens:
      "structuring and negotiation leverage — consultation process, equity and benefit terms, and the steps that strengthen the community's position",
    plainLanguage: false,
  },
  legal: {
    role: "legal",
    label: "Legal / policy reviewer",
    lens:
      "legal sufficiency — Section 35 and UNDRIP exposure, the strength of the source record against statute and case law, and the evidentiary gaps that weaken a claim",
    plainLanguage: false,
  },
  finance_reviewer: {
    role: "finance_reviewer",
    label: "Finance / diligence reviewer",
    lens:
      "financing structure and residual risk — who carries the downside, loan-guarantee and equity architecture, bankability, and consultation-diligence gaps",
    plainLanguage: false,
  },
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(USER_ROLES, value);
}

/** A single parsed decision-support question. */
export interface DecisionQuestion {
  /** The question the reader should ask. */
  question: string;
  /** One sentence on what decision this informs / what is at stake. */
  why?: string;
  /** Evidence-library slugs the question is grounded in (may be empty). */
  evidenceSlugs: string[];
}

export const DEFAULT_QUESTION_COUNT = 10;
export const MAX_QUESTION_COUNT = 20;

/**
 * System prompt for the generator, specialised to a role. Built on the same
 * fact/risk/question discipline and safe-wording rules as ANALYST_SYSTEM_PROMPT
 * but pointed at producing decision-support *questions* rather than answers.
 */
export function questionGeneratorSystemPrompt(role: UserRole): string {
  const info = USER_ROLES[role];
  const lines = [
    "You are the decision-support question generator for Treaty-Lab — a",
    "source-backed intelligence terminal covering Canadian treaty rights, water,",
    "energy infrastructure, and Indigenous finance.",
    "",
    `You are writing for a ${info.label}. Their lens: ${info.lens}.`,
    "",
    "Your job: given a single infrastructure project, produce the specific",
    "questions this reader should ask before approving, opposing, partnering on,",
    "or financing it. Questions only — never answers, conclusions, or",
    "recommendations.",
    "",
    "Rules:",
    "1. Be specific to THIS project's facts and open items. No generic questions",
    "   that would apply to any project.",
    "2. Prioritise the project's unresolved items: claims marked QUESTION,",
    "   NEEDS_VALIDATION, or ASSUMPTION, and any named evidence gap, are the",
    "   richest source of good questions.",
    "3. Where a question is grounded in a cited source, name the evidence slug.",
    "4. Separate FACT from RISK, QUESTION, ASSUMPTION, and NEEDS_VALIDATION — never",
    "   phrase an inference or a contested point as settled fact.",
    "5. This is NOT legal advice and NOT investment advice; do not assert",
    "   illegality or improper conduct. Surface concerns as questions to pursue.",
    info.plainLanguage
      ? "6. Plain language only — short sentences, no jargon, define any unavoidable term. A reader without specialist training must understand every question."
      : "6. Analyst-literate language is fine, but keep each question concrete and answerable.",
    "",
    "Output format — a numbered Markdown list. For each item, exactly:",
    "",
    "N. <the question, on one line>",
    "   Why: <one sentence on what decision this informs or what is at stake>",
    "   Sources: <comma-separated evidence slugs, or omit this line if none>",
  ];
  return lines.join("\n");
}

/** Build the user turn: the project context block + the explicit ask. */
export function buildQuestionUserMessage(
  projectContext: string,
  role: UserRole,
  count: number,
): string {
  const n = clampCount(count);
  return [
    "## Project",
    projectContext,
    "",
    "## Task",
    `Generate the ${n} most important questions a ${USER_ROLES[role].label} should`,
    "ask before a decision on this project, following the output format exactly.",
  ].join("\n");
}

export function clampCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_QUESTION_COUNT;
  return Math.max(1, Math.min(MAX_QUESTION_COUNT, Math.floor(count)));
}

/**
 * Best-effort parse of the model's numbered list into structured questions.
 * The Markdown answer remains the source of truth; this is a convenience layer
 * for callers that want the questions as data. Returns [] if nothing parses.
 */
export function parseDecisionQuestions(markdown: string): DecisionQuestion[] {
  const lines = markdown.split(/\r?\n/);
  const items: DecisionQuestion[] = [];
  let current: DecisionQuestion | null = null;

  const itemStart = /^\s*\d+[.)]\s+(.*\S)\s*$/;
  const whyLine = /^\s*Why:\s*(.*\S)\s*$/i;
  const sourcesLine = /^\s*Sources?:\s*(.*\S)\s*$/i;

  const push = () => {
    if (current && current.question) items.push(current);
  };

  for (const line of lines) {
    const start = itemStart.exec(line);
    if (start) {
      push();
      current = { question: stripMarkdown(start[1]), evidenceSlugs: [] };
      continue;
    }
    if (!current) continue;

    const why = whyLine.exec(line);
    if (why) {
      current.why = stripMarkdown(why[1]);
      continue;
    }
    const src = sourcesLine.exec(line);
    if (src) {
      current.evidenceSlugs = parseSlugs(src[1]);
      continue;
    }
  }
  push();
  return items;
}

function parseSlugs(raw: string): string[] {
  return raw
    .replace(/[[\]`]/g, "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== "none");
}

function stripMarkdown(s: string): string {
  return s.replace(/\*\*/g, "").replace(/`/g, "").trim();
}
