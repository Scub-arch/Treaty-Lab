import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DPL-001: emit a self-contained server bundle (.next/standalone/server.js)
  // so the runtime Docker stage ships only traced deps, not all of node_modules.
  output: "standalone",
};

export default nextConfig;
