import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Indicator } from "@/lib/content/types";
import { SeverityBadge, TrendIndicator } from "./indicator-badge";

export function RiskCard({ indicator, className }: { indicator: Indicator; className?: string }) {
  return (
    <div
      className={cn(
        "border border-border rounded-md bg-card p-4 hover:border-foreground/20 transition-colors",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
            {indicator.domain}
          </div>
          <h3 className="font-semibold text-sm leading-tight mt-1 text-foreground">
            {indicator.name}
          </h3>
        </div>
        <SeverityBadge severity={indicator.severity} />
      </div>
      <div className="flex items-baseline gap-3 mt-3">
        <div className="font-mono text-2xl font-semibold tracking-tight text-foreground">
          {indicator.value}
        </div>
        <TrendIndicator trend={indicator.trend} />
      </div>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{indicator.summary}</p>
      {indicator.note && (
        <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed border-l-2 border-border pl-2.5">
          {indicator.note}
        </p>
      )}
      {indicator.sources && indicator.sources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.12em] mb-1.5">
            SOURCES
          </div>
          <ul className="space-y-0.5">
            {indicator.sources.map((s) => (
              <li key={s.evidenceSlug} className="text-[11px] text-muted-foreground">
                <Link
                  href={`/evidence/${s.evidenceSlug}`}
                  className="hover:text-foreground hover:underline underline-offset-2"
                >
                  → {s.citing}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
