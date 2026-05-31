/**
 * POST /api/auth/signout — destroy the current session and clear the cookie,
 * then redirect home (303 so the browser issues a GET).
 */

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", new URL(req.url).origin), { status: 303 });
}
