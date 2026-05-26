import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** Short module code in monospace, e.g. "TRT-01" */
  code?: string;
  /** One-line subtitle under the title */
  subtitle?: string;
  /** Optional right-aligned actions (e.g. badge, link) */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A standard intelligence-terminal panel: titled, bordered, with optional code/actions header. */
export function IntelligencePanel({
  title,
  code,
  subtitle,
  actions,
  children,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "border border-border bg-card rounded-md overflow-hidden",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 px-5 py-3 border-b border-border bg-muted/30">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            {code && (
              <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
                {code}
              </span>
            )}
            <h2 className="font-semibold text-sm tracking-tight text-foreground truncate">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
