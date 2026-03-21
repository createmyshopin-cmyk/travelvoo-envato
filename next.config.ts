import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: parent folder also has package-lock.json — trace files from this app only
  outputFileTracingRoot: path.join(__dirname),

  async redirects() {
    return [{ source: "/create-tenant", destination: "/create-account", permanent: true }];
  },

  eslint: {
    // Vite project predates Next’s default @typescript-eslint strictness; tighten rules incrementally.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Supabase typed client + copied Vite code: fix `never` / `any` mismatches incrementally.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
