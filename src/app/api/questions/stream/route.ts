/**
 * POST /api/questions/stream — SSE streaming variant of /api/questions (AI-007).
 *
 * Same inputs as /api/questions (projectSlug, role, count?, focus?) but streams
 * the generated question list as it is produced. Wire format matches
 * /api/ask/stream: text/event-stream, one JSON-encoded StreamEvent per `data:`
 * line, separated by blank lines.
 *
 * Event types (src/lib/llm/databricks-chat.ts):
 *   { type: "content", text } | { type: "thought", text } | { type: "model", model }
 *   { type: "usage", usage } | { type: "error", error } | { type: "done" }
 *
 * The client accumulates `content` chunks into Markdown and parses them
 * progressively with parseDecisionQuestions().
 */

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { checkChatRateLimit, rateLimitResponseInit } from "@/lib/ratelimit";
import { getProject } from "@/lib/content";
import { chatTreatyStream, type StreamEvent, type Message } from "@/lib/llm";
import { buildProjectContext } from "@/lib/llm/question-context";
import {
  USER_ROLES,
  isUserRole,
  isDomain,
  DOMAIN_LABELS,
  clampCount,
  questionGeneratorSystemPrompt,
  buildQuestionUserMessage,
  DEFAULT_QUESTION_COUNT,
} from "@/lib/llm/question-generator";

export const runtime = "nodejs";

interface QuestionsStreamRequest {
  projectSlug?: string;
  role?: string;
  count?: number;
  focus?: string;
  maxTokens?: number;
  temperature?: number;
}

function jsonError(error: string, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return jsonError("Authentication required.", 401);

  const limited = await checkChatRateLimit(session);
  if (limited) {
    const { body: rlBody, headers } = rateLimitResponseInit(limited);
    return new Response(JSON.stringify(rlBody), {
      status: 429,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  let body: QuestionsStreamRequest;
  try {
    body = (await req.json()) as QuestionsStreamRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.projectSlug || typeof body.projectSlug !== "string") {
    return jsonError("`projectSlug` is required and must be a string", 400);
  }
  if (!isUserRole(body.role)) {
    return jsonError(
      `\`role\` is required and must be one of: ${Object.keys(USER_ROLES).join(", ")}`,
      400,
    );
  }
  if (body.focus != null && !isDomain(body.focus)) {
    return jsonError(`\`focus\` must be one of: ${Object.keys(DOMAIN_LABELS).join(", ")}`, 400);
  }
  const focus = isDomain(body.focus) ? body.focus : undefined;

  const project = getProject(body.projectSlug);
  if (!project) {
    return jsonError(`No project found for slug "${body.projectSlug}"`, 404);
  }

  const count = clampCount(body.count ?? DEFAULT_QUESTION_COUNT);
  const { context } = buildProjectContext(project);
  const messages: Message[] = [
    { role: "system", content: questionGeneratorSystemPrompt(body.role) },
    { role: "user", content: buildQuestionUserMessage(context, body.role, count, focus) },
  ];

  const startedAt = Date.now();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };
      try {
        for await (const ev of chatTreatyStream(messages, {
          maxTokens: body.maxTokens ?? 1800,
          temperature: body.temperature ?? 0.4,
          signal: req.signal,
        })) {
          write(ev);
          if (ev.type === "error" || ev.type === "done") break;
        }
      } catch (err) {
        write({ type: "error", error: err instanceof Error ? err.message : String(err) });
      } finally {
        logger.info(
          {
            event: "questions.stream",
            userId: session.userId,
            orgId: session.orgId,
            projectSlug: project.slug,
            role: body.role,
            focus: focus ?? null,
            requested: count,
            durationMs: Date.now() - startedAt,
          },
          "questions streamed",
        );
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
