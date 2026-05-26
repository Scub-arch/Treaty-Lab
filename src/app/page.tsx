import Link from "next/link";
import {
  getIndicators,
  getProjects,
  getExplainer,
  getModules,
} from "@/lib/content";
import type { Domain, Severity } from "@/lib/content/types";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";
import { RiskCard } from "@/components/intel/risk-card";
import { WatchlistTable } from "@/components/intel/watchlist-table";
import { PlainLanguageBox } from "@/components/intel/plain-language-box";
import {
  RadarOverview,
  type DomainComposite,
} from "@/components/intel/radar-overview";
import { GeographicOverview } from "@/components/intel/geographic-overview";
import { LoadGrowthTrend } from "@/components/intel/load-growth-trend";
import { Glow } from "@/components/ui/glow";
import { ProjectAssessmentCard } from "@/components/intel/project-assessment-card";
import { ArrowRight } from "lucide-react";

// Project + territory anchors plotted on the Command Center globe.
// Coordinates are approximate — sourced from public maps / regulator filings.
const GLOBE_MARKERS = [
  { id: "cedar-lng", location: [54.05, -128.65] as [number, number], label: "Cedar LNG · Kitimat (Haisla territory)", kind: "project" as const },
  { id: "cgl-east", location: [55.77, -120.24] as [number, number], label: "Coastal GasLink · Dawson Creek (origin)", kind: "project" as const },
  { id: "site-c", location: [56.25, -120.85] as [number, number], label: "Site C · Peace River (Treaty 8)", kind: "project" as const },
  { id: "blueberry-river", location: [57.0, -122.0] as [number, number], label: "Blueberry River FN territory (Yahey claim area)", kind: "territory" as const },
  { id: "tmx-edmonton", location: [53.55, -113.49] as [number, number], label: "TMX origin · Edmonton", kind: "project" as const },
  { id: "tmx-burnaby", location: [49.27, -122.95] as [number, number], label: "TMX terminus · Burnaby (Tsleil-Waututh)", kind: "project" as const },
  { id: "genesee-dc", location: [53.30, -114.30] as [number, number], label: "Capital Power Genesee DC proposal (Treaty 6)", kind: "datacentre" as const },
  { id: "aeso-calgary", location: [51.05, -114.07] as [number, number], label: "AESO data-centre cluster · Calgary (3,533 MW)", kind: "datacentre" as const },
];

const GLOBE_ARCS = [
  // TMX corridor (Edmonton → Burnaby)
  { start: [53.55, -113.49] as [number, number], end: [49.27, -122.95] as [number, number] },
  // CGL corridor (Dawson Creek → Kitimat → feeds Cedar LNG)
  { start: [55.77, -120.24] as [number, number], end: [54.05, -128.65] as [number, number] },
];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  elevated: 3,
  moderate: 2,
  low: 1,
};

const DOMAIN_LABELS: Record<Domain, string> = {
  treaty: "Treaty",
  water: "Water",
  energy: "Energy",
  finance: "Finance",
  governance: "Governance",
};

export default function CommandCenter() {
  const indicators = getIndicators();
  const projects = getProjects();
  const modules = getModules();

  // Surface the highest-severity indicators across all domains for the home dashboard.
  const featured = [...indicators]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, 4);

  // Composite per-domain severity for the radar overview.
  const composites: DomainComposite[] = (Object.keys(DOMAIN_LABELS) as Domain[]).map(
    (domain) => {
      const inDomain = indicators.filter((i) => i.domain === domain);
      const score = inDomain.length
        ? inDomain.reduce((sum, i) => sum + SEVERITY_RANK[i.severity], 0) /
          inDomain.length
        : 0;
      return {
        domain,
        label: DOMAIN_LABELS[domain],
        severityScore: Number(score.toFixed(2)),
        indicatorCount: inDomain.length,
      };
    },
  );

  const projectCertainty = getExplainer("what-is-project-certainty");

  return (
    <div className="px-6 py-8 space-y-10 max-w-[1600px] mx-auto">
      {/* Hero thesis with subtle institutional glow backdrop */}
      <section className="relative overflow-hidden">
        <Glow variant="top" className="opacity-40 -z-10" />
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          COMMAND CENTER · PILOT v0.1
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight max-w-4xl">
          Project certainty now depends on water, grid realism, treaty rights,
          Indigenous validation, and evidence traceability.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-3xl leading-relaxed">
          Treaty-Lab turns messy legal, financial, technical, government, and community information
          into clear intelligence for decision-making — for First Nation communities,
          infrastructure investors, legal and policy researchers, and government-relations teams.
          Every claim in this pilot is traced to public-record evidence and clearly separated into
          confirmed facts, risks, questions, assumptions, and items needing legal or community
          validation.
        </p>
      </section>

      {/* 4-quadrant Command Center overview */}
      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          CMD · OVERVIEW
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quadrant 1 (TL): Geographic */}
          <IntelligencePanel
            title="Geographic Intelligence — Projects & Territories"
            code="CMD · GEO"
            subtitle="Pilot projects, affected First-Nation territories, and proposed data-centre clusters. Drag to rotate."
          >
            <GeographicOverview markers={GLOBE_MARKERS} arcs={GLOBE_ARCS} />
          </IntelligencePanel>

          {/* Quadrant 2 (TR): Composite severity */}
          <IntelligencePanel
            title="Cross-Domain Severity Composite"
            code="CMD · COMPOSITE"
            subtitle="Average indicator-severity per domain. Higher = more pressing exposure."
          >
            <RadarOverview composites={composites} />
            <div className="mt-4 pt-4 border-t border-border/60">
              <ul className="space-y-1.5 text-sm">
                {composites.map((c) => (
                  <li key={c.domain} className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground/90">{c.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono tabular-nums font-medium">
                        {c.severityScore.toFixed(2)}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        / 5.00
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ({c.indicatorCount} ind.)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </IntelligencePanel>

          {/* Quadrant 3 (BL): Trend chart */}
          <IntelligencePanel
            title="Energy & Grid — Pressure Trend"
            code="CMD · TREND"
            subtitle="AESO data-centre interconnection queue is the highest-velocity grid-stress signal in the Treaty 6 / 8 corridors."
          >
            <LoadGrowthTrend />
          </IntelligencePanel>

          {/* Quadrant 4 (BR): Pilot project mini-cards */}
          <IntelligencePanel
            title="Pilot Project Assessments"
            code="CMD · PRJ"
            subtitle={`${projects.length} projects under continuous review across treaty, water, energy, and finance dimensions.`}
            actions={
              <Link
                href="/projects"
                className="font-mono text-[10px] tracking-[0.12em] text-foreground/80 hover:text-foreground inline-flex items-center gap-1"
              >
                OPEN ALL
                <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((p) => (
                <ProjectAssessmentCard key={p.slug} project={p} />
              ))}
            </div>
          </IntelligencePanel>
        </div>
      </section>


      {/* Featured risk indicators */}
      <section>
        <PanelHeader title="Current Risk Indicators" code="CMD · 01" subtitle="Highest-severity readings across all modules." />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          {featured.map((i) => (
            <RiskCard key={i.slug} indicator={i} />
          ))}
        </div>
      </section>

      {/* Project watchlist */}
      <section>
        <PanelHeader
          title="Active Assessments — Infrastructure Watchlist"
          code="CMD · 02"
          subtitle={`${projects.length} projects under continuous review across treaty, water, energy, and finance dimensions.`}
          action={{ href: "/projects", label: "OPEN ALL ASSESSMENTS" }}
        />
        <div className="mt-4 border border-border rounded-md bg-card">
          <WatchlistTable projects={projects} />
        </div>
      </section>

      {/* Modules */}
      <section>
        <PanelHeader
          title="Intelligence Modules"
          code="CMD · 03"
          subtitle="Each module aggregates indicators, projects, and evidence for one dimension of project certainty."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          {modules.map((m) => (
            <Link
              key={m.slug}
              href={`/${m.slug}`}
              className="group border border-border rounded-md bg-card p-5 hover:border-foreground/20 transition-colors"
            >
              <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {m.slug}
              </div>
              <h3 className="font-semibold text-base mt-1 group-hover:underline underline-offset-2">
                {m.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {m.tagline}
              </p>
              <div className="font-mono text-[10px] tracking-[0.12em] text-foreground/70 mt-4 inline-flex items-center gap-1 group-hover:text-foreground">
                OPEN MODULE
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Plain language for orientation */}
      {projectCertainty && (
        <section>
          <PlainLanguageBox explainer={projectCertainty} />
        </section>
      )}

      {/* Footnote */}
      <section className="pt-6 border-t border-border">
        <IntelligencePanel
          title="Methodology Note"
          code="CMD · META"
          subtitle="How this pilot handles evidence, claims, and uncertainty."
        >
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li>
              <span className="font-medium text-foreground">Claims are separated by kind.</span>{" "}
              Each project assessment distinguishes confirmed facts, identified risks, open questions,
              stated assumptions, and items that need community or legal validation.
            </li>
            <li>
              <span className="font-medium text-foreground">Sources are linked.</span>{" "}
              Indicators and claims cite items in the Evidence Library, which records reliability,
              what each source actually supports, and known limitations.
            </li>
            <li>
              <span className="font-medium text-foreground">Plain-language explainers</span>{" "}
              translate finance, governance, and legal concepts into language that supports
              community decision-making.
            </li>
            <li>
              <span className="font-medium text-foreground">The Treaty Archive</span>{" "}
              ({" "}
              <Link href="/archive" className="underline underline-offset-2 hover:text-foreground">
                /archive
              </Link>{" "}
              ) holds the actual texts of Numbered Treaties and key international instruments that
              ground modern Indigenous-rights arguments.
            </li>
          </ul>
        </IntelligencePanel>
      </section>
    </div>
  );
}

function PanelHeader({
  title,
  code,
  subtitle,
  action,
}: {
  title: string;
  code?: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        {code && (
          <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
            {code}
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight mt-1">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="font-mono text-[10px] tracking-[0.12em] text-foreground/80 hover:text-foreground inline-flex items-center gap-1"
        >
          {action.label}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
