import Link from "next/link";
import {
  getIndicators,
  getProjects,
  getExplainer,
  getModules,
} from "@/lib/content";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";
import { RiskCard } from "@/components/intel/risk-card";
import { WatchlistTable } from "@/components/intel/watchlist-table";
import { PlainLanguageBox } from "@/components/intel/plain-language-box";
import { ArrowRight } from "lucide-react";

const SEVERITY_RANK = { critical: 5, high: 4, elevated: 3, moderate: 2, low: 1 } as const;

export default function CommandCenter() {
  const indicators = getIndicators();
  const projects = getProjects();
  const modules = getModules();

  // Surface the highest-severity indicators across all domains for the home dashboard.
  const featured = [...indicators]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, 4);

  const projectCertainty = getExplainer("what-is-project-certainty");

  return (
    <div className="px-6 py-8 space-y-10 max-w-[1600px] mx-auto">
      {/* Hero thesis */}
      <section>
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
