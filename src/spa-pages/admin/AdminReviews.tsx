import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Star, Search, RefreshCw, Check, X, Trash2, Eye } from "lucide-react";

interface Review {
  id: string;
  stay_id: string;
  guest_name: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
}

interface Stay {
  id: string;
  name: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [reviewsRes, staysRes] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name"),
    ]);
    setReviews((reviewsRes.data as Review[]) || []);
    setStays((staysRes.data as Stay[]) || []);
    setLoading(false);
  };

  const stayName = (id: string) => stays.find((s) => s.id === id)?.name || "Unknown";

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchAll();
      toast({ title: `Review ${status}` });
    }
  };

  const deleteReview = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    fetchAll();
    toast({ title: "Review deleted" });
  };

  const filtered = reviews.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch = !search || r.guest_name.toLowerCase().includes(search.toLowerCase()) || r.comment.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    avgRating: reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "0",
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> Reviews
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage guest reviews and ratings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Approved", value: stats.approved },
          { label: "Rejected", value: stats.rejected },
          { label: "Avg Rating", value: `⭐ ${stats.avgRating}` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      {filtered.length > 0 ? (
        <>
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Stay</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.guest_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{stayName(r.stay_id)}</TableCell>
                    <TableCell>{"⭐".repeat(r.rating)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.comment}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status !== "approved" && (
                          <Button size="icon" variant="ghost" onClick={() => updateStatus(r.id, "approved")} title="Approve">
                            <Check className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button size="icon" variant="ghost" onClick={() => updateStatus(r.id, "rejected")} title="Reject">
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => deleteReview(r.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{r.guest_name}</p>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{stayName(r.stay_id)}</p>
                  <p className="text-sm">{"⭐".repeat(r.rating)}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{r.comment}</p>
                  <div className="flex gap-1 pt-1">
                    {r.status !== "approved" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "approved")}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteReview(r.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Star className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No reviews found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReviews;
