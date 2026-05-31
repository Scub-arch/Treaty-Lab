import { Skeleton } from "@/components/ui/skeleton";

// UI-001 — loading skeleton for the server-rendered Reports index
// (await readdir/stat over the report images). Mirrors the report-card layout.
export default function ReportsLoading() {
  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
        RPT · INDEX · LOADING
      </div>

      {/* Header */}
      <div>
        <Skeleton className="h-9 md:h-10 w-80" />
        <Skeleton className="h-4 w-full max-w-3xl mt-4" />
        <Skeleton className="h-4 w-5/6 max-w-3xl mt-2" />
      </div>

      {/* Report cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-16 mb-3" />
          <article className="border border-border bg-card rounded-md overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full mt-2" />
            </div>
            <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-900/40">
              <Skeleton className="h-72 w-full max-w-[1100px] mx-auto" />
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}
