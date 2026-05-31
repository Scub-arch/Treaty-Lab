"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Scale,
  Droplets,
  Zap,
  Banknote,
  FolderKanban,
  Library,
  Lightbulb,
  Archive,
  ListTree,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Optional short module code shown in monospace */
  code?: string;
}

const intelligence: NavItem[] = [
  { href: "/", label: "Command Center", icon: Activity, code: "CMD" },
  { href: "/treaty", label: "Treaty Terminal", icon: Scale, code: "TRT" },
  { href: "/water", label: "Water Intelligence", icon: Droplets, code: "WTR" },
  { href: "/energy", label: "Energy & Grid", icon: Zap, code: "ENG" },
  { href: "/finance", label: "Indigenous Finance", icon: Banknote, code: "FIN" },
];

const research: NavItem[] = [
  { href: "/projects", label: "Project Assessments", icon: FolderKanban, code: "PRJ" },
  { href: "/evidence", label: "Evidence Library", icon: Library, code: "EVD" },
  { href: "/sources", label: "Cited Sources", icon: ListTree, code: "SRC" },
  { href: "/explainers", label: "Plain-Language", icon: Lightbulb, code: "EXP" },
  { href: "/archive", label: "Treaty Archive", icon: Archive, code: "ARC" },
];

const tools: NavItem[] = [
  { href: "/ask", label: "Analyst Q&A", icon: MessageSquare, code: "ASK" },
  { href: "/reports", label: "Static Reports", icon: BarChart3, code: "RPT" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="block">
          <div className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
            TREATY · LAB
          </div>
          <div className="font-semibold tracking-tight text-base mt-0.5">Intelligence Terminal</div>
          <div className="font-mono text-[10px] text-muted-foreground mt-1">PILOT v0.1</div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <NavGroup title="Intelligence" items={intelligence} pathname={pathname} />
        <NavGroup title="Research" items={research} pathname={pathname} />
        <NavGroup title="Tools" items={tools} pathname={pathname} />
        <RecentChats pathname={pathname} />
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Evidence-First · Plain-Language · Decision-Support
        </div>
        <div className="font-mono text-[10px] text-muted-foreground mt-1">
          Sample data is illustrative.
        </div>
      </div>
    </aside>
  );
}

interface ChatSessionSummary {
  id: string;
  title: string | null;
  turnCount: number;
}

// UI-002: the signed-in user's recent /ask conversations. Hidden when empty or
// signed out (the API returns 401). Refetches on navigation.
function RecentChats({ pathname }: { pathname: string }) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/sessions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sessions?: ChatSessionSummary[] } | null) => {
        if (active) setSessions(d?.sessions ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  if (sessions.length === 0) return null;

  return (
    <div>
      <div className="px-2 mb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Recent
      </div>
      <ul className="space-y-0.5">
        {sessions.map((s) => {
          const href = `/ask?session=${s.id}`;
          const active = pathname === "/ask";
          return (
            <li key={s.id}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active ? "text-sidebar-foreground/90" : "text-sidebar-foreground/70",
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{s.title ?? "Untitled chat"}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.turnCount}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      <div className="px-2 mb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.code && (
                  <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                    {item.code}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
