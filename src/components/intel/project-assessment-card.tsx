import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProjectAssessment, ProjectStatus } from "@/lib/content/types";
import { EvidenceStrengthBadge } from "./evidence-strength-badge";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  proposed: "PROPOSED",
  in_review: "IN REVIEW",
  approved: "APPROVED",
  under_construction: "UNDER CONSTRUCTION",
  operational: "OPERATIONAL",
  paused: "PAUSED",
  litigated: "LITIGATED",
  cancelled: "CANCELLED",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  proposed: "text-sky-400 border-sky-400/30",
  in_review: "text-sky-400 border-sky-400/30",
  approved: "text-emerald-400 border-emerald-400/30",
  under_construction: "text-amber-400 border-amber-400/30",
  operational: "text-emerald-400 border-emerald-400/30",
  paused: "text-zinc-400 border-zinc-400/30",
  litigated: "text-orange-400 border-orange-400/30",
  cancelled: "text-zinc-400 border-zinc-400/30",
};

export function ProjectAssessmentCard({
  project,
  className,
}: {
  project: ProjectAssessment;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "border border-border rounded-md bg-card p-5 hover:border-foreground/20 transition-colors flex flex-col h-full",
        className,
      )}
    >
      <header className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-[10px] tracking-[0.12em] font-medium",
              STATUS_COLOR[project.status],
            )}
          >
            {STATUS_LABEL[project.status]}
          </span>
          <EvidenceStrengthBadge strength={project.evidenceConfidence} withIcon={false} />
        </div>
        <h3 className="font-semibold text-base leading-tight">
          <Link
            href={`/projects/${project.slug}`}
            className="hover:underline underline-offset-2"
          >
            {project.name}
          </Link>
        </h3>
        <div className="text-xs text-muted-foreground mt-1">{project.location}</div>
      </header>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
        {project.summary}
      </p>

      <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
        <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">PROPONENT</dt>
        <dd className="text-foreground/90 truncate" title={project.proponent}>
          {project.proponent.split(" (")[0]}
        </dd>
        <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">FINANCE</dt>
        <dd className="text-foreground/90 truncate" title={project.finance.totalCostEstimate}>
          {project.finance.totalCostEstimate ?? "—"}
        </dd>
        <dt className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">DOMAINS</dt>
        <dd className="text-foreground/90 font-mono tracking-wider text-[10px] uppercase">
          {project.domains.join(" · ")}
        </dd>
      </dl>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] text-muted-foreground">
          {project.parties.length} parties tracked
        </span>
        <Link
          href={`/projects/${project.slug}`}
          className="font-mono text-[10px] tracking-[0.12em] text-foreground/80 hover:text-foreground"
        >
          OPEN ASSESSMENT →
        </Link>
      </div>
    </article>
  );
}
