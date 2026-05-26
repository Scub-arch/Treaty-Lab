import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlainLanguageExplainer } from "@/lib/content/types";

export function PlainLanguageBox({
  explainer,
  className,
  variant = "card",
}: {
  explainer: PlainLanguageExplainer;
  className?: string;
  variant?: "card" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "border-l-2 border-amber-400/50 bg-amber-400/5 pl-4 pr-3 py-3 rounded-r-sm",
          className,
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[10px] tracking-[0.15em] text-amber-400 uppercase">
            Plain Language
          </span>
        </div>
        <p className="text-sm font-medium leading-snug">{explainer.question}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {explainer.shortAnswer}
        </p>
        <Link
          href={`/explainers/${explainer.slug}`}
          className="font-mono text-[10px] tracking-[0.12em] text-foreground/70 hover:text-foreground inline-flex items-center gap-1 mt-2"
        >
          READ MORE
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <article
      className={cn(
        "border border-border rounded-md bg-card p-5 hover:border-foreground/20 transition-colors",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
          Plain Language
        </span>
      </div>
      <h3 className="font-semibold text-base leading-tight mb-2">
        <Link
          href={`/explainers/${explainer.slug}`}
          className="hover:underline underline-offset-2"
        >
          {explainer.question}
        </Link>
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {explainer.shortAnswer}
      </p>
      <div className="mt-3 pt-3 border-t border-border/60">
        <Link
          href={`/explainers/${explainer.slug}`}
          className="font-mono text-[10px] tracking-[0.12em] text-foreground/80 hover:text-foreground inline-flex items-center gap-1"
        >
          OPEN EXPLAINER
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </article>
  );
}
