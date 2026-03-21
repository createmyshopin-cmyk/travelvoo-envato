import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Ban, KeyRound } from "lucide-react";
import { format } from "date-fns";

type Row = {
  id: string;
  domain: string;
  envato_item_id: number;
  item_name: string | null;
  license_label: string | null;
  last_verified_at: string;
  revoked_at: string | null;
  created_at: string;
};

export default function SaasAdminEnvatoLicenses() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("envato_domain_licenses")
      .select(
        "id, domain, envato_item_id, item_name, license_label, last_verified_at, revoked_at, created_at"
      )
      .order("last_verified_at", { ascending: false });

    if (error) {
      toast({
        title: "Could not load licenses",
        description: error.message,
        variant: "destructive",
      });
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.domain.toLowerCase().includes(q) ||
      String(r.envato_item_id).includes(q) ||
      (r.item_name ?? "").toLowerCase().includes(q)
    );
  });

  async function revoke(id: string) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("envato_domain_licenses")
      .update({ revoked_at: now, updated_at: now })
      .eq("id", id);
    setRevokeId(null);
    if (error) {
      toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domain activation revoked" });
    void fetchRows();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-7 w-7" />
            Envato domain licenses
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Domains recorded when buyers activate with a purchase code + domain. Purchase codes are never stored—only hashes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchRows()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activations</CardTitle>
          <CardDescription>Filter by domain or item ID. Revoke to block future support for that activation record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search domain or item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Envato item ID</TableHead>
                  <TableHead>Last verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No rows yet. Apply <code className="text-xs bg-muted px-1 rounded">manual_apply_envato_domain_licenses.sql</code> and activate from{" "}
                      <code className="text-xs bg-muted px-1 rounded">/license</code>.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.domain}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={r.item_name ?? ""}>
                        {r.item_name ?? "—"}
                      </TableCell>
                      <TableCell>{r.envato_item_id}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(r.last_verified_at), "PPp")}
                      </TableCell>
                      <TableCell>
                        {r.revoked_at ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!r.revoked_at ? (
                          <Button variant="ghost" size="sm" onClick={() => setRevokeId(r.id)}>
                            <Ban className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this domain activation?</AlertDialogTitle>
            <AlertDialogDescription>
              This does not delete the row; it marks the activation as revoked for your records. The buyer may still have a valid cookie until it expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeId && void revoke(revokeId)}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
