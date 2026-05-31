import { Search } from "lucide-react";
import { AuthStatus } from "@/components/intel/auth-status";
import { ThemeMenu } from "@/components/intel/theme-menu";

export function TopBar() {
  // Live UTC + system status line — institutional terminal feel.
  // Pure server component; no live updates required for the pilot.
  const utc = new Date().toISOString().replace("T", " ").slice(0, 19);
  return (
    <div className="border-b border-border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="flex items-center gap-6 px-6 h-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="w-4 h-4" />
          <span className="text-sm">
            Search the terminal{" "}
            <span className="font-mono text-xs text-muted-foreground/60">(coming soon)</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-6 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE</span>
          </div>
          <div>UTC {utc}</div>
          <div>SAMPLE DATA · NOT INVESTMENT ADVICE</div>
          <ThemeMenu />
          <AuthStatus />
        </div>
      </div>
    </div>
  );
}
