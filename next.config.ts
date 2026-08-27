import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the repo tree exactly as designed: no auto-generated agent files.
  agentRules: false,
  // A stray package-lock.json in the user's home dir confuses Turbopack's
  // workspace-root detection; pin the root to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
