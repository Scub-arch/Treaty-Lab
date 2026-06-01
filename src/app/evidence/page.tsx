import {
  getEvidence,
  getProjects,
  getIndicators,
  getExplainers,
  evidenceMap,
  topCitedEvidence,
  sankeyEvidenceToProject,
} from "@/lib/content";
import { EvidenceBrowser } from "./evidence-browser";
import { TopCitedEvidenceChart } from "@/components/intel/top-cited-evidence-chart";
import { CitationSankey } from "@/components/intel/citation-sankey";

export const metadata = { title: "Evidence Library — Treaty-Lab" };

const TOP_N = 15;

export default function EvidenceLibraryPage() {
  const items = getEvidence();
  const evBySlug = evidenceMap(items);

  // Server-side citation walk for the top-N chart
  const topCited = topCitedEvidence(
    getProjects(),
    getIndicators(),
    getExplainers(),
    evBySlug,
    TOP_N,
  );

  // Server-side Sankey flow data: source-type → project
  const sankey = sankeyEvidenceToProject(getProjects(), evBySlug);
  const totalSankeyFlow = sankey.links.reduce((acc, l) => acc + l.value, 0);

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          EVD · LIBRARY
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Evidence Library
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          Public-record sources that ground every claim in this pilot. Each item records what it
          actually supports and its known limitations. Reliability indicates the strength of the
          source itself — not whether you should agree with what it says.
        </p>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          EVD · 00 — TOP CITED
        </div>
        <div className="border border-border rounded-md bg-card p-5 space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight">
              Top {TOP_N} most-cited evidence items
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              Citation sites counted across all project assessments (primary sources + claim sources
              + finance sources), indicators, and explainer cross-references. Bar colour shows
              source type. The same source can appear in multiple places; this counts each.
            </p>
          </div>
          <TopCitedEvidenceChart records={topCited} />
        </div>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          EVD · 01 — CITATION GRAPH
        </div>
        <div className="border border-border rounded-md bg-card p-5 space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight">
              Source type → project citation flow
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              {totalSankeyFlow} project-level citation sites grouped by source type (left) and
              destination project (right). Band thickness = citation count. Reading bottom-up shows
              which projects lean on which evidence categories; reading left-to-right shows where
              each source type is doing work.
            </p>
          </div>
          <CitationSankey data={sankey} />
        </div>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          EVD · 02 — ALL SOURCES
        </div>
        <EvidenceBrowser items={items} />
      </section>
    </div>
  );
}
