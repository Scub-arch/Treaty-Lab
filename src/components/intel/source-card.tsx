import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/lib/content/types";
import { EvidenceStrengthBadge } from "./evidence-strength-badge";

const SOURCE_TYPE_LABEL: Record<EvidenceItem["sourceType"], string> = {
  court_decision: "Court decision",
  legislation: "Legislation",
  treaty_text: "Treaty text",
  regulatory_filing: "Regulatory filing",
  government_report: "Govt report",
  academic: "Academic",
  news: "News",
  ngo_report: "NGO report",
  corporate_disclosure: "Corporate disclosure",
  financial_prospectus: "Financial prospectus",
};

export function SourceCard({ item, className }: { item: EvidenceItem; className?: string }) {
  return (
    <article
      className={cn(
        "border border-border rounded-md bg-card p-5 hover:border-foreground/20 transition-colors",
        className,
      )}
    >
      <header className="mb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {SOURCE_TYPE_LABEL[item.sourceType]}
          </span>
          <EvidenceStrengthBadge strength={item.reliability} />
          {item.publishedAt && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.publishedAt}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-base leading-tight">
          <Link href={`/evidence/${item.slug}`} className="hover:underline underline-offset-2">
            {item.title}
          </Link>
        </h3>
        {item.author && (
          <div className="text-xs text-muted-foreground mt-1">{item.author}</div>
        )}
      </header>

      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {item.plainSummary}
      </p>

      {item.supports.length > 0 && (
        <div className="mb-3">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.12em] mb-1.5">
            SUPPORTS
          </div>
          <ul className="text-xs text-foreground/90 space-y-1 list-disc list-inside marker:text-muted-foreground">
            {item.supports.slice(0, 2).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            {item.supports.length > 2 && (
              <li className="list-none text-muted-foreground">
                +{item.supports.length - 2} more
              </li>
            )}
          </ul>
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/60">
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] text-muted-foreground tracking-wider px-1.5 py-0.5 border border-border/60 rounded-sm"
            >
              {t}
            </span>
          ))}
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            SOURCE
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </footer>
    </article>
  );
}
