"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LicenseActivation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [code, setCode] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseCode: code.trim(),
          ...(domain.trim() ? { domain: domain.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean; itemName?: string; domainPersist?: string };
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }
      setSuccess(data.itemName ? `Licensed: ${data.itemName}` : "License activated.");
      router.replace(from);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Activate Envato license</CardTitle>
          <CardDescription>
            Enter your purchase code. Optionally add your site domain so it appears in SaaS Admin → Envato licenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseCode">Purchase code</Label>
              <Input
                id="purchaseCode"
                name="purchaseCode"
                autoComplete="off"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain (optional)</Label>
              <Input
                id="domain"
                name="domain"
                autoComplete="off"
                placeholder="app.yoursite.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stored as a hash only. Requires <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-green-600 dark:text-green-400">{success}</p> : null}
            <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
              {loading ? "Verifying…" : "Verify & activate"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
