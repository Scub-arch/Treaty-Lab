/**
 * GET /api/auth/session — current auth status for client UI (e.g. the TopBar).
 * Returns { user: { email, name } | null }. No-store so it is never cached.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  return NextResponse.json(
    { user: session ? { email: session.email, name: session.name } : null },
    { headers: { "cache-control": "no-store" } },
  );
}
