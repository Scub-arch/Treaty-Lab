import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading for /evidence — this page is the heaviest server-render
 * in the app (~410 KB output: Sankey + top-cited bar + filter chips + card list).
 * Shapes its skeleton accordingly so the layout doesn't reflow on first paint.
 */
export default function EvidenceLoading() {
  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header + tag chip row */}
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          EVD · LIBRARY · LOADING
        </div>
        <Skeleton className="h-9 md:h-10 w-72" />
        <Skeleton className="h-4 w-full max-w-3xl mt-4" />
        <Skeleton className="h-4 w-5/6 max-w-3xl mt-2" />
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16" />
          ))}
        </div>
      </section>

      {/* Top-cited bar chart panel */}
      <ChartPanelSkeleton heightClass="h-72" />

      {/* Sankey panel */}
      <ChartPanelSkeleton heightClass="h-96" />

      {/* Evidence card list */}
      <section>
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

function ChartPanelSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <section className="border border-border bg-card rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="p-5">
        <Skeleton className={`${heightClass} w-full`} />
      </div>
    </section>
  );
}
