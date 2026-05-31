import { Skeleton } from "@/components/ui/skeleton";

// UI-001 — loading skeleton for the server-rendered Treaty Archive index
// (prisma.treaty.findMany). Mirrors the archive index layout.
export default function ArchiveLoading() {
  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
        ARC · INDEX · LOADING
      </div>

      {/* Header */}
      <div>
        <Skeleton className="h-9 md:h-10 w-72" />
        <Skeleton className="h-4 w-full max-w-3xl mt-4" />
        <Skeleton className="h-4 w-5/6 max-w-3xl mt-2" />
      </div>

      {/* Filter chips */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          ARC · 01 — FILTER BY TOPIC
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>
      </div>

      {/* Treaty cards */}
      <div>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          ARC · 02 — TREATIES
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
