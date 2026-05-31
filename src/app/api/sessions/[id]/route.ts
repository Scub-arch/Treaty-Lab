/**
 * GET    /api/sessions/[id] — load a session + its turns (owner only) (UI-002).
 * DELETE /api/sessions/[id] — delete a session (owner only).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatSession, deleteChatSession } from "@/lib/chat-sessions";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const chat = await getChatSession(session.userId, id);
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ session: chat }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const ok = await deleteChatSession(session.userId, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
