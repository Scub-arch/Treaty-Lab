import { cn } from "@/lib/utils";
import type { Severity, Trend } from "@/lib/content/types";
import { ArrowDownRight, ArrowUpRight, HelpCircle, Minus } from "lucide-react";

const SEVERITY_STYLES: Record<Severity, string> = {
  low: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  moderate: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  elevated: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  critical: "text-red-400 border-red-400/40 bg-red-400/10",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "LOW",
  moderate: "MODERATE",
  elevated: "ELEVATED",
  high: "HIGH",
  critical: "CRITICAL",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-[10px] tracking-[0.12em] font-medium",
        SEVERITY_STYLES[severity],
        className,
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function TrendIndicator({ trend, className }: { trend: Trend; className?: string }) {
  const config = {
    improving: { Icon: ArrowUpRight, color: "text-emerald-400", label: "IMPROVING" },
    stable: { Icon: Minus, color: "text-muted-foreground", label: "STABLE" },
    deteriorating: { Icon: ArrowDownRight, color: "text-orange-400", label: "DETERIORATING" },
    unknown: { Icon: HelpCircle, color: "text-muted-foreground", label: "UNKNOWN" },
  }[trend];
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em]",
        config.color,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
