"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  /** Short mono label shown in the fallback header (e.g. "EVD · 00 — TOP CITED"). */
  label?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

/**
 * UI-001 — contains client-side render errors thrown by a recharts chart (after
 * hydration: ResponsiveContainer measurement, a malformed data path, etc.). The
 * route-level error.tsx boundary cannot reach those, so a chart crash would
 * otherwise blank the whole page. On error this renders a styled fallback card
 * (matching the PROD-001 error/panel styling) instead.
 */
export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Match root error.tsx: only log in development.
    if (process.env.NODE_ENV !== "production") {
      console.error("ChartErrorBoundary caught a render error:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-border bg-card rounded-md overflow-hidden">
          <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
              {this.props.label ?? "CHART · UNAVAILABLE"}
            </span>
          </header>
          <div className="p-5 min-h-[14rem] flex flex-col justify-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Could not render this chart.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
              The underlying data is still available on the linked source and detail pages.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * HOC form — wrap a chart component so its render errors are contained:
 *   export default withChartErrorBoundary(MyChart, "MOD · CHART");
 */
export function withChartErrorBoundary<P extends object>(
  Chart: React.ComponentType<P>,
  label?: string,
) {
  function Wrapped(props: P) {
    return (
      <ChartErrorBoundary label={label}>
        <Chart {...props} />
      </ChartErrorBoundary>
    );
  }
  Wrapped.displayName = `withChartErrorBoundary(${Chart.displayName ?? Chart.name ?? "Chart"})`;
  return Wrapped;
}
