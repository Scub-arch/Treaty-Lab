/**
 * POST /api/sessions/[id]/turns — append a completed turn to a session (UI-002).
 * Body: { question, answer, reasoning?, model?, projectSlug?, domainSlug? }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appendTurn } from "@/lib/chat-sessions";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: {
    question?: string;
    answer?: string;
    reasoning?: string;
    model?: string;
    projectSlug?: string;
    domainSlug?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.question || !body.answer) {
    return NextResponse.json({ error: "`question` and `answer` are required" }, { status: 400 });
  }

  const created = await appendTurn(session.userId, id, {
    question: body.question,
    answer: body.answer,
    reasoning: body.reasoning || undefined,
    model: body.model || undefined,
    projectSlug: body.projectSlug || undefined,
    domainSlug: body.domainSlug || undefined,
  });
  if (!created) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(created, { status: 201 });
}
