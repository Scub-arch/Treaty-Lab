"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary, rendered when any Server Component below the root
 * layout throws. Must be a Client Component (Next.js requirement).
 *
 * In development we surface error.message so the cause is obvious; in
 * production we keep the user-facing text generic and only show the
 * `digest` identifier so a support request can be correlated to a server log.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in dev consoles + any browser error reporters that listen.
    // Production logging goes through Next.js' built-in error pipeline.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[Treaty-Lab] route error:", error);
    }
  }, [error]);

  const showDetail = process.env.NODE_ENV !== "production" && error?.message;
  const digest = error?.digest ?? "unknown";

  return (
    <div className="px-6 py-12 max-w-[1600px] mx-auto">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
        ERROR · TREATY-LAB
      </div>

      <div className="max-w-2xl border border-border bg-card rounded-md overflow-hidden">
        <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
            ERR · {digest}
          </span>
        </header>

        <div className="p-5 space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            Something went wrong loading this view.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The terminal couldn&apos;t render this section. This is usually a transient issue —
            retrying often works. If it keeps happening, head back to the Command Center and try
            again from there.
          </p>

          {showDetail && (
            <pre className="font-mono text-[11px] leading-snug bg-muted/50 border border-border rounded-md p-3 overflow-x-auto text-foreground/80 max-h-48">
              {error.message}
            </pre>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={() => reset()} variant="default" size="sm">
              <RotateCw className="w-3.5 h-3.5" />
              Try again
            </Button>
            <Button render={<Link href="/" />} variant="outline" size="sm">
              <Home className="w-3.5 h-3.5" />
              Go to Command Center
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
