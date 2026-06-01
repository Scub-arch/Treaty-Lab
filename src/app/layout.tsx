import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/intel/sidebar";
import { TopBar } from "@/components/intel/top-bar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Treaty-Lab — Source-backed Indigenous infrastructure intelligence",
  description:
    "Source-backed Indigenous infrastructure intelligence terminal. Designed to help communities, analysts, leadership, and advisors understand project risk before decisions are made — through traceable evidence, plain-language risk analysis, and project decision support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* UI-003: apply the saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=document.cookie.match(/(?:^|; )tl_theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):'dark';document.documentElement.className=t==='light'?'':t==='high-contrast'?'high-contrast':'dark';}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${mono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {/* A11y: skip-to-content link — the first focusable element, hidden
            until keyboard focus, so keyboard and screen-reader users can bypass
            the sidebar nav on every page and jump straight to the main content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <div className="grid grid-cols-[260px_1fr] min-h-screen">
          <Sidebar />
          <div className="flex flex-col min-w-0">
            <TopBar />
            <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
