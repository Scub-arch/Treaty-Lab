import { Skeleton } from "@/components/ui/skeleton";

// UI-001 — loading skeleton for the server-rendered treaty detail page
// (prisma.treaty.findUnique). Mirrors the archive/[slug] two-column layout.
export default function TreatyDetailLoading() {
  return (
    <div className="px-6 py-8 space-y-8 max-w-[1200px] mx-auto">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
        ARC · TREATY · LOADING
      </div>

      {/* Back link + header */}
      <Skeleton className="h-4 w-32" />
      <div>
        <Skeleton className="h-9 md:h-10 w-2/3 max-w-2xl" />
        <Skeleton className="h-4 w-48 mt-4" />
      </div>

      {/* Summary paragraph */}
      <div className="space-y-2 max-w-3xl">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* Two-column: text panel + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="border border-border bg-card rounded-md overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="p-5">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>

        <aside className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </aside>
      </div>
    </div>
  );
}
