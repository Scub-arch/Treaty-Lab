import { getProjects } from "@/lib/content";
import { ProjectAssessmentCard } from "@/components/intel/project-assessment-card";
import { WatchlistTable } from "@/components/intel/watchlist-table";

export const metadata = { title: "Project Assessments — Treaty-Lab" };

export default function ProjectsPage() {
  const projects = getProjects();

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
