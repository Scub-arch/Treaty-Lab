/**
 * POST /api/questions — AI-005 decision-question generator.
 *
 * Given a project + a user role, returns the questions that reader should ask
 * before approving, opposing, partnering on, or financing the project
 * (North Star §10 item 8). Mirrors /api/ask: auth-gated, rate-limited, RAG
 * context assembled from src/content, routed through the Databricks gateway.
 *
 * Request body:
 *   {
 *     projectSlug: string,   // required — must resolve to a ProjectAssessment
 *     role: UserRole,        // required — one of USER_ROLES
 *     count?: number,        // questions to generate (default 10, max 20)
 *     maxTokens?: number,    // default 1800
 *     temperature?: number,  // default 0.4
 *   }
 *
 * Response:
 *   {
 *     projectSlug, role, count,
 *     questionsMarkdown: string,        // authoritative model output
 *     questions: DecisionQuestion[],    // best-effort structured parse
 *     usage?, model?, cached?,
 *     contextSummary: { claimsCount, openItemsCount, evidenceCount }
 *   }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { checkChatRateLimit, rateLimitResponseInit } from "@/lib/ratelimit";
import { getProject, allClaimsForProject } from "@/lib/content";
import type { ProjectAssessment } from "@/lib/content/types";
import { chatTreaty, type Message } from "@/lib/llm";
import {
  USER_ROLES,
  isUserRole,
  clampCount,
  questionGeneratorSystemPrompt,
  buildQuestionUserMessage,
  parseDecisionQuestions,
  DEFAULT_QUESTION_COUNT,
} from "@/lib/llm/question-generator";

interface QuestionsRequest {
  projectSlug?: string;
  role?: string;
  count?: number;
  maxTokens?: number;
  temperature?: number;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const startedAt = Date.now();

  const limited = await checkChatRateLimit(session);
  if (limited) {
    logger.warn(
      { event: "questions.ratelimited", userId: session.userId, orgId: session.orgId, scope: limited.scope },
      "question generation rate limit hit",
    );
    const { body, headers } = rateLimitResponseInit(limited);
    return NextResponse.json(body, { status: 429, headers });
  }

  let body: QuestionsRequest;
  try {
    body = (await req.json()) as QuestionsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.projectSlug || typeof body.projectSlug !== "string") {
    return NextResponse.json(
      { error: "`projectSlug` is required and must be a string" },
      { status: 400 },
    );
  }
  if (!isUserRole(body.role)) {
    return NextResponse.json(
      { error: `\`role\` is required and must be one of: ${Object.keys(USER_ROLES).join(", ")}` },
      { status: 400 },
    );
  }

  const project = getProject(body.projectSlug);
  if (!project) {
    return NextResponse.json(
      { error: `No project found for slug "${body.projectSlug}"` },
      { status: 404 },
    );
  }

  const count = clampCount(body.count ?? DEFAULT_QUESTION_COUNT);
  const { context, summary } = buildProjectContext(project);

  const messages: Message[] = [
    { role: "system", content: questionGeneratorSystemPrompt(body.role) },
    { role: "user", content: buildQuestionUserMessage(context, body.role, count) },
  ];

  try {
    const result = await chatTreaty(messages, {
      maxTokens: body.maxTokens ?? 1800,
      temperature: body.temperature ?? 0.4,
    });

    const questions = parseDecisionQuestions(result.answer);

    logger.info(
      {
        event: "questions",
        userId: session.userId,
        orgId: session.orgId,
        projectSlug: project.slug,
        role: body.role,
        requested: count,
        parsed: questions.length,
        model: result.model,
        cacheHit: Boolean(result.cached),
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        durationMs: Date.now() - startedAt,
      },
      "questions generated",
    );

    return NextResponse.json({
      projectSlug: project.slug,
      role: body.role,
      count,
      questionsMarkdown: result.answer,
      questions,
      ...(result.cached ? { cached: true } : {}),
      usage: result.usage,
      model: result.model,
      contextSummary: summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      {
        event: "questions.error",
        userId: session.userId,
        orgId: session.orgId,
        projectSlug: project.slug,
        role: body.role,
        durationMs: Date.now() - startedAt,
        err: message,
      },
      "question generation gateway error",
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// ---------------------------------------------------------------------------
// Context builder — surfaces the project's open items, which are the richest
// source of good decision questions.
// ---------------------------------------------------------------------------

function buildProjectContext(p: ProjectAssessment): {
  context: string;
  summary: { claimsCount: number; openItemsCount: number; evidenceCount: number };
} {
  const claims = allClaimsForProject(p);
  const openKinds = new Set(["risk", "question", "assumption", "needs_validation"]);
  const openItemsCount = claims.filter((c) => openKinds.has(c.kind)).length;

  const claimLines = claims
    .map(
      (c) =>
        `- [${c.kind.toUpperCase()}] ${c.text}${
          c.sources?.length ? ` (sources: ${c.sources.map((s) => s.evidenceSlug).join(", ")})` : ""
        }`,
    )
    .join("\n");

  const parties = p.parties
    .map((party) => `- ${party.name} — ${party.role}`)
    .join("\n");

  const context = [
    `### ${p.name} (${p.slug})`,
    `Status: ${p.status} · Location: ${p.location} · Jurisdictions: ${p.jurisdictions.join(", ")}`,
    `Proponent: ${p.proponent}`,
    `Summary: ${p.summary}`,
    `Government objective: ${p.governmentObjective}`,
    `Proponent objective: ${p.proponentObjective}`,
    `Evidence confidence in this assessment: ${p.evidenceConfidence}`,
    "",
    "Parties:",
    parties,
    "",
    "Claims (separated by kind — QUESTION / NEEDS_VALIDATION / ASSUMPTION are open items):",
    claimLines,
    "",
    `Finance structure: ${p.finance.structure}`,
    p.finance.totalCostEstimate ? `Cost estimate: ${p.finance.totalCostEstimate}` : "",
    `Who carries residual risk: ${p.finance.riskCarrier}`,
    "",
    p.governanceQuestions.length
      ? `Already-noted governance questions:\n${p.governanceQuestions.map((q) => `- ${q}`).join("\n")}`
      : "",
    p.recommendedCommunityQuestions.length
      ? `Already-noted community questions (extend these, do not repeat):\n${p.recommendedCommunityQuestions
          .map((q) => `- ${q}`)
          .join("\n")}`
      : "",
    "",
    `Primary sources: ${p.primarySources.map((s) => `${s.evidenceSlug} — ${s.citing}`).join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    context,
    summary: {
      claimsCount: claims.length,
      openItemsCount,
      evidenceCount: p.primarySources.length,
    },
  };
}
