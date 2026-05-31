/**
 * UI-002 — persisted /ask conversations. All helpers are scoped to a userId so
 * a user can only ever see or mutate their own ChatSessions.
 */

import { prisma } from "@/lib/db";

/** Sessions inactive longer than this are hidden from listing (lazy expiry). */
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createChatSession(userId: string): Promise<{ id: string }> {
  return prisma.chatSession.create({ data: { userId }, select: { id: true } });
}

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  updatedAt: Date;
  turnCount: number;
}

export async function listChatSessions(userId: string): Promise<ChatSessionSummary[]> {
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows = await prisma.chatSession.findMany({
    where: { userId, updatedAt: { gte: cutoff } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, title: true, updatedAt: true, _count: { select: { turns: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updatedAt,
    turnCount: r._count.turns,
  }));
}

/** Load a session with its turns — only if owned by `userId`, else null. */
export async function getChatSession(userId: string, id: string) {
  const s = await prisma.chatSession.findUnique({
    where: { id },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!s || s.userId !== userId) return null;
  return s;
}

export async function deleteChatSession(userId: string, id: string): Promise<boolean> {
  const s = await prisma.chatSession.findUnique({ where: { id }, select: { userId: true } });
  if (!s || s.userId !== userId) return false;
  await prisma.chatSession.delete({ where: { id } });
  return true;
}

export interface TurnInput {
  question: string;
  answer: string;
  reasoning?: string;
  model?: string;
  projectSlug?: string;
  domainSlug?: string;
}

/** Append a turn to an owned session; titles the session from its first question. */
export async function appendTurn(
  userId: string,
  id: string,
  turn: TurnInput,
): Promise<{ id: string } | null> {
  const s = await prisma.chatSession.findUnique({
    where: { id },
    select: { userId: true, title: true },
  });
  if (!s || s.userId !== userId) return null;

  const created = await prisma.chatTurn.create({
    data: {
      chatSessionId: id,
      question: turn.question,
      answer: turn.answer,
      reasoning: turn.reasoning,
      model: turn.model,
      projectSlug: turn.projectSlug,
      domainSlug: turn.domainSlug,
    },
    select: { id: true },
  });

  // Always write title (existing or first-question-derived) so updatedAt bumps.
  await prisma.chatSession.update({
    where: { id },
    data: { title: s.title ?? turn.question.slice(0, 80) },
  });

  return created;
}
