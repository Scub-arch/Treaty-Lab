import { auth } from "@/lib/auth";
import { getEvidence, getProject } from "@/lib/content";
import { buildProjectReport } from "@/lib/reports/project-template";

// RPT-002 — POST /api/reports/project/[slug]
// Returns a generated .docx export of the project assessment. The ".docx" is
// conveyed to the browser via the download filename (Content-Disposition), so
// the route segment stays a clean dynamic [slug].
//
// Auth: the SEC-001 proxy lets every /api/* request through unauthenticated, so
// each handler enforces the session itself. Like the sibling data routes
// (/api/ask, /api/ask/stream) this returns a JSON 401 when there is no session,
// rather than leaking the full assessment export to anonymous callers.
export async function POST(_req: Request, ctx: RouteContext<"/api/reports/project/[slug]">) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { slug } = await ctx.params;

  const project = getProject(slug);
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const generatedOn = new Date().toISOString().slice(0, 10);
  const buffer = await buildProjectReport(project, getEvidence(), generatedOn);
  const filename = `treaty-lab-${slug}-${generatedOn}.docx`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
