import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  code: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  /** Optional tone for the value (tints the big number) */
  tone?: "default" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  sky: "text-sky-400",
};

export function KpiCard({ code, label, value, sublabel, icon: Icon, tone = "default", className }: Props) {
  return (
    <div
      className={cn(
        "border border-border rounded-md bg-card p-4 hover:border-foreground/20 transition-colors flex flex-col",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em]">
          {code}
        </div>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />}
      </div>
      <div
        className={cn(
          "font-mono text-3xl font-semibold tracking-tight tabular-nums leading-none",
          TONE_CLASSES[tone],
        )}
      >
        {value}
      </div>
      <div className="text-xs text-foreground/90 mt-2 font-medium">{label}</div>
      {sublabel && (
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{sublabel}</div>
      )}
    </div>
  );
}
