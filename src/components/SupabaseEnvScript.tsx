import Script from "next/script";

/** Injects public Supabase config before client bundles run — fixes stale/wrong baked NEXT_PUBLIC_* in dev. */
export function SupabaseEnvScript() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const payload = JSON.stringify({ url, anonKey });
  return (
    <Script
      id="stay-supabase-env"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `window.__STAY_SUPABASE__=${payload};`,
      }}
    />
  );
}
