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
        body: JSON.stringify({ purchaseCode: code.trim() }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean; itemName?: string };
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
            Enter the purchase code from your CodeCanyon / ThemeForest download page. Your server must have{" "}
            <code className="rounded bg-muted px-1 text-xs">ENVATO_API_TOKEN</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">ENVATO_ITEM_ID</code>, and{" "}
            <code className="rounded bg-muted px-1 text-xs">LICENSE_SECRET</code> set — see README-ENVATO.md.
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
