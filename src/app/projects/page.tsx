import {
  getProjects,
  getEvidence,
  evidenceMap,
  projectCitationsBySourceType,
} from "@/lib/content";
import type { SourceType } from "@/lib/content/types";
import { ProjectAssessmentCard } from "@/components/intel/project-assessment-card";
import { WatchlistTable } from "@/components/intel/watchlist-table";
import { PerProjectCitationChart, type CitationChartRow } from "@/components/intel/per-project-citation-chart";

export const metadata = { title: "Project Assessments — Treaty-Lab" };

const SOURCE_TYPE_ORDER: SourceType[] = [
  "government_report",
  "court_decision",
  "legislation",
  "regulatory_filing",
  "academic",
  "news",
  "corporate_disclosure",
  "treaty_text",
  "ngo_report",
  "financial_prospectus",
];

export default function ProjectsPage() {
  const projects = getProjects();
  const evidence = getEvidence();
  const evBySlug = evidenceMap(evidence);

  // Build chart rows server-side (pure computation, runs at request time)
  const rawRows: CitationChartRow[] = projects.map((p) => {
    const counts = projectCitationsBySourceType(p, evBySlug);
    const row: CitationChartRow = { project: p.shortName ?? p.name, total: 0 };
    let total = 0;
    for (const st of SOURCE_TYPE_ORDER) {
      const n = counts.get(st) ?? 0;
      if (n > 0) {
        row[st] = n;
        total += n;
      }
    }
    row.total = total;
    return row;
  });

  // Sort ascending so the densest project sits at the top of a horizontal bar
  const chartRows = [...rawRows].sort((a, b) => a.total - b.total);

  // Only render stacks that have non-zero data somewhere
  const presentTypes: SourceType[] = SOURCE_TYPE_ORDER.filter((st) =>
    chartRows.some((r) => (r[st] as number | undefined) !== undefined && (r[st] as number) > 0),
  );

  const totalCitations = rawRows.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="px-6 py-8 space-y-10 max-w-[1600px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          PRJ · INDEX
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Project Assessments
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          Each assessment separates confirmed facts, identified risks, open questions, stated
          assumptions, and items needing community or legal validation. All claims are linked to
          public-record evidence. Evidence-confidence reflects the strength of the public source
          trail — not a rating of the project itself.
        </p>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          PRJ · 00 — EVIDENCE FOOTPRINT
        </div>
        <div className="border border-border rounded-md bg-card p-5 space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight">
              Per-project citation footprint by source type
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              Total of {totalCitations} citation sites across the {projects.length} project
              assessments, including primary sources, claim sources, and finance sources. Bar
              colour shows the source-type mix grounding each project; bar width is the count.
              Computed live from the content store via the <code className="font-mono">aggregations</code> helpers.
            </p>
          </div>
          <PerProjectCitationChart rows={chartRows} presentTypes={presentTypes} />
        </div>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          PRJ · 01 — WATCHLIST
        </div>
        <div className="border border-border rounded-md bg-card">
          <WatchlistTable projects={projects} />
        </div>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          PRJ · 02 — DETAILED CARDS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectAssessmentCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
