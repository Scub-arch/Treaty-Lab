import { cn } from "@/lib/utils";
import type { EvidenceStrength } from "@/lib/content/types";
import { ShieldCheck, Shield, ShieldAlert, ShieldQuestion } from "lucide-react";

const STYLES: Record<EvidenceStrength, { color: string; label: string; Icon: typeof Shield }> = {
  established: {
    color: "text-indigo-300 border-indigo-300/30 bg-indigo-300/10",
    label: "ESTABLISHED",
    Icon: ShieldCheck,
  },
  strong: {
    color: "text-sky-300 border-sky-300/30 bg-sky-300/10",
    label: "STRONG",
    Icon: Shield,
  },
  moderate: {
    color: "text-amber-300 border-amber-300/30 bg-amber-300/10",
    label: "MODERATE",
    Icon: ShieldAlert,
  },
  weak: {
    color: "text-zinc-400 border-zinc-400/30 bg-zinc-400/10",
    label: "WEAK",
    Icon: ShieldQuestion,
  },
};

export function EvidenceStrengthBadge({
  strength,
  className,
  withIcon = true,
}: {
  strength: EvidenceStrength;
  className?: string;
  withIcon?: boolean;
}) {
  const s = STYLES[strength];
  const Icon = s.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono text-[10px] tracking-[0.12em] font-medium",
        s.color,
        className,
      )}
    >
      {withIcon && <Icon className="w-3 h-3" />}
      {s.label}
    </span>
  );
}
