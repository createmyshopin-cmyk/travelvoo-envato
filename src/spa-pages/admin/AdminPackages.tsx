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
import { ExternalLink, Loader2, Package, Pencil, Plus, RefreshCw } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { AdminPackageCreateDialog } from "@/components/admin/AdminPackageCreateDialog";
import { getPlatformTenantId } from "@/lib/platformTenant";

interface TripRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  starting_price: number;
  pickup_drop_location: string | null;
  pickup_location: string | null;
  drop_location: string | null;
}

function pickupDropCell(r: TripRow): string {
  const p = (r.pickup_location ?? "").trim();
  const d = (r.drop_location ?? "").trim();
  if (p && d) return `${p} → ${d}`;
  if (p || d) return p || d;
  const legacy = (r.pickup_drop_location ?? "").trim();
  return legacy || "—";
}

export default function AdminPackages() {
  const { format: fmt } = useCurrency();
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTripId, setEditTripId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const platformId = await getPlatformTenantId();
    const filterId = tenantId ?? platformId;

    let q = (supabase.from("trips") as any)
      .select("id, slug, name, status, starting_price, pickup_drop_location, pickup_location, drop_location")
      .order("created_at", { ascending: false });

    if (filterId != null) {
      q = q.eq("tenant_id", filterId);
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
            Trips &amp; packages shown on your site. Create, edit, or open the public trip page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditTripId(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create package
          </Button>
          <Button variant="outline" size="sm" onClick={fetchTrips} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <AdminPackageCreateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTripId(null);
        }}
        editTripId={editTripId}
        onSaved={fetchTrips}
      />

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
              No packages yet. Click <strong>Create package</strong> or run seed SQL for your tenant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Pickup / drop</TableHead>
                  <TableHead className="text-right">From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[220px] truncate" title={pickupDropCell(r)}>
                      {pickupDropCell(r)}
                    </TableCell>
                    <TableCell className="text-right">{fmt(Number(r.starting_price))}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setEditTripId(r.id);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
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
                      </div>
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
