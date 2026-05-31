/**
 * GET /api/healthz — liveness/readiness probe for the deploy platform (DPL-001).
 *
 * Public (passed through by the proxy like all /api/* routes; does not call
 * auth()). Reports overall status plus DB reachability and whether a Databricks
 * gateway token can be resolved. Returns 200 when healthy, 503 when degraded.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToken } from "@/lib/llm";

export const dynamic = "force-dynamic";

async function checkDb(): Promise<"ok" | "down"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "down";
  }
}

async function checkGateway(): Promise<"ok" | "down"> {
  // Lightweight: can we resolve a token at all? Cached U2M / M2M / PAT all count.
  // Does not make a chat call. M2M envs trigger one OIDC fetch (then cached).
  try {
    await getToken({});
    return "ok";
  } catch {
    return "down";
  }
}

export async function GET() {
  const [db, gateway] = await Promise.all([checkDb(), checkGateway()]);
  const status = db === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    { status, db, gateway },
    {
      status: db === "ok" ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
