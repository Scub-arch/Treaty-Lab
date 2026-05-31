"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

// RPT-002 — client button that POSTs to the .docx export route and triggers a
// browser download of the returned Word document. Busy/error state is announced
// to assistive tech (aria-busy + a role=status/alert live region) and the failed
// error is surfaced visibly, mirroring the login-form / ask-form convention. The
// saved filename comes from the server's Content-Disposition so it shares the one
// server-side timestamp the document body prints.
export function ExportDocxButton({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/project/${slug}`, { method: "POST" });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const filename =
        filenameFromDisposition(res.headers.get("Content-Disposition")) ?? `treaty-lab-${slug}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-60 transition-colors"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        {busy ? "Generating…" : error ? "Retry export" : "Export .docx"}
      </button>
      {(busy || error) && (
        <span
          role={error ? "alert" : "status"}
          className={`font-mono text-[10px] ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {busy ? "Generating Word document…" : error}
        </span>
      )}
    </div>
  );
}

// Pull `filename="…"` out of a Content-Disposition header (same-origin fetch can
// read it); returns null if absent so the caller can fall back.
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1] : null;
}
