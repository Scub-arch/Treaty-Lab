import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProjectAssessment } from "@/lib/content/types";
import { EvidenceStrengthBadge } from "./evidence-strength-badge";

const STATUS_LABEL: Record<ProjectAssessment["status"], string> = {
  proposed: "PROPOSED",
  in_review: "IN REVIEW",
  approved: "APPROVED",
  under_construction: "UNDER CONST.",
  operational: "OPERATIONAL",
  paused: "PAUSED",
  litigated: "LITIGATED",
  cancelled: "CANCELLED",
};

export function WatchlistTable({
  projects,
  className,
}: {
  projects: ProjectAssessment[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-4 py-2.5">
              CODE
            </th>
            <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-4 py-2.5">
              PROJECT
            </th>
            <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-4 py-2.5">
              STATUS
            </th>
            <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-4 py-2.5">
              JURISDICTION
            </th>
            <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-4 py-2.5">
              FINANCE
            </th>
            <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-4 py-2.5">
              EVIDENCE
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p, i) => (
            <tr
              key={p.slug}
              className={cn(
                "border-b border-border/40 hover:bg-muted/30 transition-colors",
                i === projects.length - 1 && "border-b-0",
              )}
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {p.shortName ?? p.slug.toUpperCase().slice(0, 6)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/projects/${p.slug}`}
                  className="font-medium text-foreground hover:underline underline-offset-2"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                {STATUS_LABEL[p.status]}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {p.jurisdictions.join(" · ")}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-foreground/90">
                {p.finance.totalCostEstimate ?? "—"}
              </td>
              <td className="px-4 py-3">
                <EvidenceStrengthBadge strength={p.evidenceConfidence} withIcon={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
