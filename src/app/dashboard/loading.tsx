import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading for /dashboard — the dashboard waits on a Promise.all
 * across four data fetches (treaties + details + resources + evidence) before
 * the first tab renders. Skeleton mirrors the header + tab-trigger row + the
 * KPI-grid layout inside the first tab so the page doesn't visibly reflow.
 */
export default function DashboardLoading() {
  return (
    <div className="px-6 py-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="space-y-2">
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          CMD · DASHBOARD · LOADING
        </div>
        <Skeleton className="h-9 md:h-10 w-80" />
        <Skeleton className="h-4 w-full max-w-3xl mt-3" />
        <Skeleton className="h-4 w-4/6 max-w-3xl" />
      </header>

      {/* Tab triggers (3 tabs, line variant) */}
      <div className="flex items-center gap-4 border-b border-border pb-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-36" />
      </div>

      {/* KPI card row */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </section>

      {/* Two stacked panels: chart + table */}
      <section className="border border-border bg-card rounded-md overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="p-5">
          <Skeleton className="h-64 w-full" />
        </div>
      </section>

      <section className="border border-border bg-card rounded-md overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-5 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
