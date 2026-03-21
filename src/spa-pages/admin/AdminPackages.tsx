"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Package, RefreshCw } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

interface TripRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  starting_price: number;
  pickup_drop_location: string | null;
}

export default function AdminPackages() {
  const { format: fmt } = useCurrency();
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");

    let q = (supabase.from("trips") as any)
      .select("id, slug, name, status, starting_price, pickup_drop_location")
      .order("created_at", { ascending: false });

    if (tenantId != null) {
      q = q.eq("tenant_id", tenantId);
    } else {
      q = q.is("tenant_id", null);
    }

    const { data, error } = await q;
    if (!error && data) setRows(data);
    else setRows([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Packages
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Trips &amp; packages shown on your site. Manage records in Supabase or extend this screen with create/edit.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTrips} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Package list</CardTitle>
          <CardDescription>
            Public URLs: <code className="text-xs bg-muted px-1 rounded">/trip/[slug]</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No packages yet. Run the seed SQL or insert rows into the <code className="text-xs">trips</code> table for your tenant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead className="text-right">From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.pickup_drop_location || "—"}
                    </TableCell>
                    <TableCell className="text-right">{fmt(Number(r.starting_price))}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={`/trip/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
