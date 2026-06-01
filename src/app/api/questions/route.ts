/**
 * POST /api/questions — AI-005 decision-question generator (blocking).
 *
 * Given a project + a user role, returns the questions that reader should ask
 * before approving, opposing, partnering on, or financing the project
 * (North Star §10 item 8). Mirrors /api/ask: auth-gated, rate-limited, RAG
 * context assembled from src/content, routed through the Databricks gateway.
 * See /api/questions/stream for the SSE streaming variant (AI-007).
 *
 * Request body:
 *   {
 *     projectSlug: string,   // required — must resolve to a ProjectAssessment
 *     role: UserRole,        // required — one of USER_ROLES
 *     count?: number,        // questions to generate (default 10, max 20)
 *     focus?: Domain,        // optional — bias questions toward one dimension
 *     maxTokens?: number,    // default 1800
 *     temperature?: number,  // default 0.4
 *   }
 *
 * Response:
 *   {
 *     projectSlug, role, count, focus,
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
import { getProject } from "@/lib/content";
import { chatTreaty, type Message } from "@/lib/llm";
import { buildProjectContext } from "@/lib/llm/question-context";
import {
  USER_ROLES,
  isUserRole,
  isDomain,
  DOMAIN_LABELS,
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
  /** AI-006: optional domain to bias the questions toward (one of `Domain`). */
  focus?: string;
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

  if (body.focus != null && !isDomain(body.focus)) {
    return NextResponse.json(
      { error: `\`focus\` must be one of: ${Object.keys(DOMAIN_LABELS).join(", ")}` },
      { status: 400 },
    );
  }
  const focus = isDomain(body.focus) ? body.focus : undefined;

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
    { role: "user", content: buildQuestionUserMessage(context, body.role, count, focus) },
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
        focus: focus ?? null,
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
      focus: focus ?? null,
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
