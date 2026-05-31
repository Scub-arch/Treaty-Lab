import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ChevronLeft } from "lucide-react";
import { getProject, getProjects, getEvidenceItem } from "@/lib/content";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";
import { EvidenceStrengthBadge } from "@/components/intel/evidence-strength-badge";
import { ProjectLineageTree } from "@/components/intel/project-lineage-tree";
import type { Claim } from "@/lib/content/types";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const p = getProject(slug);
  return { title: p ? `${p.name} — Treaty-Lab` : "Project — Treaty-Lab" };
}

export default async function ProjectDetail(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Back */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-3 h-3" />
          BACK TO PROJECTS
        </Link>
      </div>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
            {project.shortName ?? project.slug.toUpperCase()}
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">·</span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            {project.status.replace(/_/g, " ")}
          </span>
          <EvidenceStrengthBadge strength={project.evidenceConfidence} />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          {project.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {project.location} · {project.jurisdictions.join(" · ")}
        </p>
        <p className="text-base text-muted-foreground mt-4 max-w-3xl leading-relaxed">
          {project.summary}
        </p>
      </header>

      {/* Two-column layout: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* Objectives */}
          <IntelligencePanel title="Objectives" code="PRJ · OBJ">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                  GOVERNMENT OBJECTIVE
                </dt>
                <dd className="leading-relaxed">{project.governmentObjective}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                  PROPONENT OBJECTIVE
                </dt>
                <dd className="leading-relaxed">{project.proponentObjective}</dd>
              </div>
            </dl>
          </IntelligencePanel>

          {/* First Nation implications */}
          <IntelligencePanel
            title="First Nation implications"
            code="PRJ · FN"
            subtitle="Claims are separated by kind. Source links open the Evidence Library."
          >
            <ClaimList claims={project.firstNationImplications} />
          </IntelligencePanel>

          {/* Treaty & water risk */}
          <IntelligencePanel title="Treaty & water risk" code="PRJ · TRW">
            <ClaimList claims={project.treatyAndWaterRisk} />
          </IntelligencePanel>

          {/* Finance risk */}
          <IntelligencePanel title="Finance risk" code="PRJ · FIN">
            <ClaimList claims={project.financeRisk} />
          </IntelligencePanel>

          {/* Recommended community questions */}
          <IntelligencePanel
            title="Recommended community questions"
            code="PRJ · ASK"
            subtitle="Questions a community should expect to have answered before signing or renegotiating."
          >
            <ol className="space-y-3 text-sm">
              {project.recommendedCommunityQuestions.map((q, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5">
                    Q{(i + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </IntelligencePanel>

          {/* Governance questions */}
          {project.governanceQuestions.length > 0 && (
            <IntelligencePanel title="Open governance questions" code="PRJ · GOV">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {project.governanceQuestions.map((q, i) => (
                  <li key={i} className="leading-relaxed">
                    — {q}
                  </li>
                ))}
              </ul>
            </IntelligencePanel>
          )}
        </div>

        <aside className="space-y-6">
          {/* Finance summary */}
          <IntelligencePanel title="Finance summary" code="PRJ · FIN-SUM">
            <dl className="text-sm space-y-3">
              <div>
                <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                  STRUCTURE
                </dt>
                <dd className="leading-relaxed">{project.finance.structure}</dd>
              </div>
              {project.finance.totalCostEstimate && (
                <div>
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                    COST
                  </dt>
                  <dd className="font-mono">{project.finance.totalCostEstimate}</dd>
                </div>
              )}
              {project.finance.costOverrunsNoted && (
                <div>
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                    OVERRUNS
                  </dt>
                  <dd className="text-muted-foreground">{project.finance.costOverrunsNoted}</dd>
                </div>
              )}
              {project.finance.loanGuarantor && (
                <div>
                  <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                    LOAN GUARANTOR
                  </dt>
                  <dd>{project.finance.loanGuarantor}</dd>
                </div>
              )}
              <div>
                <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground mb-1">
                  RISK CARRIER
                </dt>
                <dd className="leading-relaxed">{project.finance.riskCarrier}</dd>
              </div>
            </dl>
          </IntelligencePanel>

          {/* Parties */}
          <IntelligencePanel title="Parties tracked" code="PRJ · PTY">
            <ul className="space-y-2 text-sm">
              {project.parties.map((p, i) => (
                <li key={i} className="text-sm">
                  <div className="font-medium leading-snug">{p.name}</div>
                  <div className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase mt-0.5">
                    {p.role.replace(/_/g, " ")}
                  </div>
                  {p.statementUrl && (
                    <a
                      href={p.statementUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
                    >
                      STATEMENT
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </IntelligencePanel>

          {/* Operates under (DATA-002) */}
          <IntelligencePanel title="Operates under" code="PRJ · TXY">
            {project.relatedTreaties && project.relatedTreaties.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {project.relatedTreaties.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/archive/${t.slug}`}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {t.shortName ?? t.name}
                    </Link>
                    <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {t.name}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No numbered treaty on record for this project&apos;s territory. Where a project sits
                on unceded land, that absence is itself an analytical signal — see the First Nation
                implications above.
              </p>
            )}
          </IntelligencePanel>

          {/* Primary sources */}
          <IntelligencePanel title="Primary sources" code="PRJ · SRC">
            <ul className="text-sm space-y-2">
              {project.primarySources.map((s) => {
                const e = getEvidenceItem(s.evidenceSlug);
                return (
                  <li key={s.evidenceSlug}>
                    <Link
                      href={`/evidence/${s.evidenceSlug}`}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {e?.title ?? s.evidenceSlug}
                    </Link>
                    <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {s.citing}
                    </div>
                  </li>
                );
              })}
            </ul>
          </IntelligencePanel>

          {/* Meta */}
          <div className="text-xs text-muted-foreground font-mono">
            Last reviewed: {project.lastReviewed}
          </div>
        </aside>
      </div>

      {/* Lineage tree (full-width below main grid) */}
      <IntelligencePanel
        title="Lineage"
        code="PRJ · LIN"
        subtitle="Project → parties (consenting / contesting / regulator / financier) and primary public-record sources. Source nodes link to the Evidence Library."
      >
        <div className="text-foreground/85">
          <ProjectLineageTree project={project} />
        </div>
      </IntelligencePanel>
    </div>
  );
}

const KIND_LABEL: Record<Claim["kind"], string> = {
  fact: "FACT",
  risk: "RISK",
  question: "QUESTION",
  assumption: "ASSUMPTION",
  needs_validation: "NEEDS VALIDATION",
};

const KIND_COLOR: Record<Claim["kind"], string> = {
  fact: "text-emerald-400 border-emerald-400/30",
  risk: "text-orange-400 border-orange-400/30",
  question: "text-sky-400 border-sky-400/30",
  assumption: "text-zinc-400 border-zinc-400/30",
  needs_validation: "text-amber-400 border-amber-400/30",
};

function ClaimList({ claims }: { claims: Claim[] }) {
  return (
    <ul className="space-y-4">
      {claims.map((c, i) => (
        <li key={i} className="border-l-2 border-border pl-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border font-mono text-[10px] tracking-[0.12em] font-medium ${KIND_COLOR[c.kind]}`}
            >
              {KIND_LABEL[c.kind]}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{c.text}</p>
          {c.sources && c.sources.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {c.sources.map((s) => (
                <li key={s.evidenceSlug} className="text-[11px] text-muted-foreground">
                  →{" "}
                  <Link
                    href={`/evidence/${s.evidenceSlug}`}
                    className="hover:text-foreground hover:underline underline-offset-2"
                  >
                    {s.citing}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
