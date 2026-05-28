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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <div className="grid grid-cols-[260px_1fr] min-h-screen">
          <Sidebar />
          <div className="flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
