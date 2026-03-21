import { Button } from "@/components/ui/button";

/** Matches `supabase/seed_admin_saas_stays.sql` — create users via that seed (or equivalent) in Supabase. */
export const DEMO_SAAS_SUPER_ADMIN = {
  email: "superadmin@stay.com",
  password: "superadmin123",
} as const;

export const DEMO_TENANT_ADMIN = {
  email: "admin@travelvoo.demo",
  password: "Travelvoo2026!",
} as const;

export function showDemoLoginHint(): boolean {
  if (import.meta.env.VITE_SHOW_DEMO_LOGIN === "true") return true;
  return import.meta.env.DEV;
}

type Variant = "saas" | "tenant";

export function DemoLoginHint({
  variant,
  onFillDemo,
}: {
  variant: Variant;
  onFillDemo?: () => void;
}) {
  if (!showDemoLoginHint()) return null;

  const creds = variant === "saas" ? DEMO_SAAS_SUPER_ADMIN : DEMO_TENANT_ADMIN;
  const title =
    variant === "saas"
      ? "Demo — SaaS Super Admin"
      : "Demo — property admin (tenant)";

  return (
    <div className="rounded-lg border border-dashed border-primary/25 bg-muted/40 p-3 text-left space-y-2">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <dl className="grid gap-1 text-[11px] sm:text-xs">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <dt className="text-muted-foreground shrink-0 w-16">Email</dt>
          <dd>
            <code className="break-all rounded bg-background/80 px-1.5 py-0.5 text-foreground">{creds.email}</code>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <dt className="text-muted-foreground shrink-0 w-16">Password</dt>
          <dd>
            <code className="break-all rounded bg-background/80 px-1.5 py-0.5 text-foreground">{creds.password}</code>
          </dd>
        </div>
      </dl>
      {onFillDemo && (
        <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs" onClick={onFillDemo}>
          Fill demo email &amp; password
        </Button>
      )}
      <p className="text-[10px] text-muted-foreground leading-snug">
        Requires the dev seed in Supabase (<code className="text-[10px]">seed_admin_saas_stays.sql</code>). Not shown in production unless{" "}
        <code className="text-[10px]">VITE_SHOW_DEMO_LOGIN=true</code>.
      </p>
    </div>
  );
}
