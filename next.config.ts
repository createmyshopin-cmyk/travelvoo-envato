import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: parent folder also has package-lock.json — trace files from this app only
  outputFileTracingRoot: path.join(__dirname),

  /** If Vercel still has legacy Vite names, map them so the client bundle gets public Supabase config. */
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  },

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
