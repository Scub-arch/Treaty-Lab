import {
  resolveIndicators,
  resolveProjects,
  getModule,
  getIndicatorsByDomain,
} from "@/lib/content";
import type { Domain } from "@/lib/content/types";
import { RiskCard } from "./risk-card";
import { ProjectAssessmentCard } from "./project-assessment-card";
import { notFound } from "next/navigation";

/** Shared layout for each module landing page (Treaty / Water / Energy / Finance). */
export function ModulePage({ slug }: { slug: Domain }) {
  const mod = getModule(slug);
  if (!mod) notFound();

  const featuredIndicators = resolveIndicators(mod.featuredIndicatorSlugs);
  const featuredProjects = resolveProjects(mod.featuredProjectSlugs);
  const allIndicatorsInDomain = getIndicatorsByDomain(slug);
  const additionalIndicators = allIndicatorsInDomain.filter(
    (i) => !mod.featuredIndicatorSlugs.includes(i.slug),
  );

  return (
    <div className="px-6 py-8 space-y-10 max-w-[1600px] mx-auto">
      {/* Module header */}
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          {mod.slug.toUpperCase()} · MODULE
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          {mod.title}
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          {mod.tagline}
        </p>
        <p className="text-sm text-muted-foreground mt-3 max-w-3xl leading-relaxed">{mod.lede}</p>
      </section>

      {/* Featured indicators */}
      <section>
        <SubHeader title="Featured Indicators" code={`${mod.slug.toUpperCase()} · 01`} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {featuredIndicators.map((i) => (
            <RiskCard key={i.slug} indicator={i} />
          ))}
        </div>
      </section>

      {/* Additional indicators in this domain */}
      {additionalIndicators.length > 0 && (
        <section>
          <SubHeader
            title="Additional readings in this domain"
            code={`${mod.slug.toUpperCase()} · 02`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {additionalIndicators.map((i) => (
              <RiskCard key={i.slug} indicator={i} />
            ))}
          </div>
        </section>
      )}

      {/* Featured projects in this module */}
      <section>
        <SubHeader
          title="Projects exposed to this module"
          code={`${mod.slug.toUpperCase()} · 03`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {featuredProjects.map((p) => (
            <ProjectAssessmentCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SubHeader({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">{code}</div>
      <h2 className="text-lg font-semibold tracking-tight mt-1">{title}</h2>
    </div>
  );
}
