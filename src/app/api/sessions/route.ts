/**
 * GET  /api/sessions — list the current user's recent chat sessions (UI-002).
 * POST /api/sessions — create a new empty session, returns { id }.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createChatSession, listChatSessions } from "@/lib/chat-sessions";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const sessions = await listChatSessions(session.userId);
  return NextResponse.json({ sessions }, { headers: { "cache-control": "no-store" } });
}

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const created = await createChatSession(session.userId);
  return NextResponse.json(created, { status: 201 });
}
