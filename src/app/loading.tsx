import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root loading state, rendered by Next.js during async server-component
 * resolution for any route segment that doesn't define its own loading.tsx.
 *
 * Matches the dark terminal aesthetic from src/app/page.tsx — same outer
 * container (max-w-[1600px], px-6 py-8, space-y-10), same monospaced
 * "LOADING · TREATY-LAB" label style, same panel border-and-bg pattern.
 */
export default function RootLoading() {
  return (
    <div className="px-6 py-8 space-y-10 max-w-[1600px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          LOADING · TREATY-LAB
        </div>

        {/* Hero title + lede stand-ins */}
        <Skeleton className="h-9 md:h-10 w-3/4 max-w-3xl" />
        <Skeleton className="h-4 w-full max-w-3xl mt-4" />
        <Skeleton className="h-4 w-5/6 max-w-3xl mt-2" />
        <Skeleton className="h-4 w-4/6 max-w-3xl mt-2" />
      </section>

      {/* 4-quadrant intelligence-panel stand-in (matches Command Center grid) */}
      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          PANELS LOADING
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PanelSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Card row stand-in (risk cards / KPI tiles) */}
      <section>
        <Skeleton className="h-5 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Stand-in for IntelligencePanel — bordered card with a header bar and a
 * tall content block. Kept inline to avoid a new shared file just for
 * skeletons.
 */
function PanelSkeleton() {
  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-5">
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
