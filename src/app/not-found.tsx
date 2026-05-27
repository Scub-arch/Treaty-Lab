import Link from "next/link";
import { Compass, ArrowRight, Search, MessageSquare, Library } from "lucide-react";

/**
 * Branded 404 page rendered by Next.js when:
 *   - a static or dynamic route doesn't match, OR
 *   - a Server Component calls notFound() (e.g. unknown [slug]).
 *
 * Match the terminal aesthetic and offer one strong primary action
 * (Command Center) plus a few rescue links into commonly-sought areas.
 */
export const metadata = {
  title: "View not found — Treaty-Lab",
};

export default function NotFound() {
  return (
    <div className="px-6 py-16 max-w-[1600px] mx-auto">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
        404 · ROUTE NOT IN REGISTRY
      </div>

      <div className="max-w-2xl">
        <div
          aria-hidden="true"
          className="font-mono text-7xl md:text-8xl font-semibold tracking-tight text-muted-foreground/50 select-none leading-none mb-6"
        >
          404
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          View not found.
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed">
          The route you requested isn&apos;t in the registry. It may have been
          moved, the URL may be misspelled, or the underlying record may have
          been removed. Use one of the entry points below to get oriented.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 text-sm font-medium h-8 px-3 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            Command Center
            <ArrowRight className="w-3.5 h-3.5 -mr-0.5" />
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
            COMMON ENTRY POINTS
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <NotFoundLink href="/projects" label="Project Assessments" icon={Search} />
            <NotFoundLink href="/evidence" label="Evidence Library" icon={Library} />
            <NotFoundLink href="/archive" label="Treaty Archive" icon={Library} />
            <NotFoundLink href="/ask" label="Analyst Q&A" icon={MessageSquare} />
          </ul>
        </div>
      </div>
    </div>
  );
}

function NotFoundLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card hover:border-foreground/30 hover:bg-muted/30 transition-colors"
      >
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-sm text-foreground/90 group-hover:text-foreground flex-1">
          {label}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>
    </li>
  );
}
