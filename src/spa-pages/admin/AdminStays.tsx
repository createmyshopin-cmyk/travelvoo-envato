import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StayForm } from "@/components/admin/StayForm";
import CategoriesBuilder from "@/components/admin/CategoriesBuilder";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, MapPin, Star, ImageIcon,
  ChevronLeft, ChevronRight, LayoutGrid, Search, CheckSquare,
  X, MoreHorizontal, Copy, Check, ExternalLink, Download,
  RefreshCw, Layers, IndianRupee, TrendingUp, Home,
  ChevronDown, ChevronUp, XCircle, Share2,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "name" | "price" | "rating" | "created_at" | "bookings_count";
type StatusTab = "all" | "active" | "draft" | "hidden";

interface BookingCount {
  [stayId: string]: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportStaysCSV(stays: any[], bookingCounts: BookingCount) {
  const headers = ["Stay ID", "Name", "Location", "Category", "Price", "Original Price", "Rating", "Reviews", "Amenities", "Status", "Images", "Bookings", "Created"];
  const rows = stays.map(s => [
    s.stay_id, s.name, s.location, s.category || "",
    s.price, s.original_price, s.rating || 0, s.reviews_count || 0,
    (s.amenities || []).join("; "), s.status,
    (s.images || []).length, bookingCounts[s.id] || 0,
    s.created_at ? format(parseISO(s.created_at), "yyyy-MM-dd HH:mm") : "",
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stays-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Image Carousel ──────────────────────────────────────────────────────────

function StayImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const hasImages = images && images.length > 0;

  if (!hasImages) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      <img src={images[current]} alt="" className="w-full h-full object-cover transition-all duration-300" loading="lazy" />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }} className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }} className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 5).map((_, i) => (
              <span key={i} className={`block h-1 rounded-full transition-all ${i === current ? "w-3 bg-background" : "w-1 bg-background/60"}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute top-1.5 right-1.5 bg-background/70 text-[10px] font-medium px-1.5 py-0.5 rounded">
        {images.length} photo{images.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminStays() {
  const { format } = useCurrency();
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editStay, setEditStay] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bookingCounts, setBookingCounts] = useState<BookingCount>({});
  const { toast } = useToast();
  const router = useRouter();

  const [categoryCount, setCategoryCount] = useState(0);

  const fetchStays = useCallback(async () => {
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    let query = supabase.from("stays").select("*").order("created_at", { ascending: false });
    if (tenantId != null) {
      query = query.eq("tenant_id", tenantId);
    }
    const { data, error } = await query;
    if (!error) {
      setStays(data || []);
      const cats = [...new Set((data || []).map((s: any) => s.category).filter(Boolean))];
      setCategories(cats as string[]);
    }
    setLoading(false);
  }, []);

  const fetchBookingCounts = useCallback(async () => {
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    let query = supabase.from("bookings").select("stay_id");
    if (tenantId != null) {
      query = query.eq("tenant_id", tenantId);
    }
    const { data } = await query;
    if (data) {
      const counts: BookingCount = {};
      data.forEach((b: any) => { if (b.stay_id) counts[b.stay_id] = (counts[b.stay_id] || 0) + 1; });
      setBookingCounts(counts);
    }
  }, []);

  const fetchCategoryCount = useCallback(async () => {
    const { data } = await supabase.from("stay_categories" as any).select("id").eq("active", true);
    setCategoryCount((data as any[] || []).length);
  }, []);

  useEffect(() => {
    fetchStays();
    fetchBookingCounts();
    fetchCategoryCount();

    const staysChannel = supabase
      .channel("stays-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stays" }, () => fetchStays())
      .subscribe();

    const catChannel = supabase
      .channel("stay_categories_count")
      .on("postgres_changes", { event: "*", schema: "public", table: "stay_categories" }, () => fetchCategoryCount())
      .subscribe();

    return () => { supabase.removeChannel(staysChannel); supabase.removeChannel(catChannel); };
  }, [fetchStays, fetchBookingCounts, fetchCategoryCount]);

  // ── Filtered + sorted ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...stays];

    if (statusTab === "active") list = list.filter(s => s.status === "active");
    else if (statusTab === "draft") list = list.filter(s => s.status === "draft");
    else if (statusTab === "hidden") list = list.filter(s => s.status !== "active" && s.status !== "draft");

    if (categoryFilter !== "all") list = list.filter(s => s.category === categoryFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.stay_id?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        String(s.price).includes(q)
      );
    }

    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "bookings_count") {
        va = bookingCounts[a.id] || 0;
        vb = bookingCounts[b.id] || 0;
      } else if (sortKey === "created_at") {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        va = a[sortKey] ?? "";
        vb = b[sortKey] ?? "";
      }
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [stays, statusTab, categoryFilter, searchQuery, sortKey, sortAsc, bookingCounts]);

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const live = stays.filter(s => s.status === "active").length;
    const draft = stays.filter(s => s.status === "draft").length;
    const hidden = stays.filter(s => s.status !== "active" && s.status !== "draft").length;
    const totalBookings = Object.values(bookingCounts).reduce((s, c) => s + c, 0);
    const avgRating = stays.length > 0
      ? (stays.reduce((s, st) => s + (st.rating || 0), 0) / stays.length).toFixed(1)
      : "0";
    const avgPrice = stays.length > 0
      ? Math.round(stays.reduce((s, st) => s + (st.price || 0), 0) / stays.length)
      : 0;
    return { total: stays.length, live, draft, hidden, totalBookings, avgRating, avgPrice };
  }, [stays, bookingCounts]);

  // ── Selection ─────────────────────────────────────────────────────────

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
  const toggleSelectAll = () => setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(s => s.id)));
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleStatus = async (stay: any) => {
    const newStatus = stay.status === "active" ? "hidden" : "active";
    const { error } = await supabase.from("stays").update({ status: newStatus }).eq("id", stay.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setStays(prev => prev.map(s => s.id === stay.id ? { ...s, status: newStatus } : s));
      toast({ title: newStatus === "active" ? "Stay visible on homepage" : "Stay hidden from homepage" });
    }
  };

  const publishDraft = async (stay: any) => {
    const { error } = await supabase.from("stays").update({ status: "active" }).eq("id", stay.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setStays(prev => prev.map(s => s.id === stay.id ? { ...s, status: "active" } : s));
      toast({ title: "Stay published", description: `${stay.name} is now live on the homepage.` });
    }
  };

  const bulkSetStatus = async (status: "active" | "hidden") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("stays").update({ status }).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setStays(prev => prev.map(s => ids.includes(s.id) ? { ...s, status } : s));
      toast({ title: `${ids.length} stay${ids.length > 1 ? "s" : ""} set to ${status}` });
      setSelectedIds(new Set());
    }
    setBulkLoading(false);
  };

  const bulkPublishDrafts = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("stays").update({ status: "active" }).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setStays(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: "active" } : s));
      toast({ title: `${ids.length} draft${ids.length > 1 ? "s" : ""} published` });
      setSelectedIds(new Set());
    }
    setBulkLoading(false);
  };

  // Extract storage path from a Supabase public URL
  const storagePathFromUrl = (url: string): string | null => {
    try {
      const marker = "/stay-images/";
      const idx = url.indexOf(marker);
      return idx !== -1 ? url.slice(idx + marker.length) : null;
    } catch {
      return null;
    }
  };

  // Delete all storage files for an array of image URLs
  const deleteStorageImages = async (imageUrls: string[]) => {
    const paths = imageUrls.map(storagePathFromUrl).filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from("stay-images").remove(paths);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // Collect all image URLs for this stay (main images + room category images)
    const stay = stays.find((s) => s.id === deleteId);
    const allImages: string[] = [...(stay?.images || [])];

    // Also fetch room category images
    const { data: rooms } = await supabase
      .from("stay_room_categories")
      .select("images")
      .eq("stay_id", deleteId);
    (rooms || []).forEach((r: any) => allImages.push(...(r.images || [])));

    // Delete storage files first
    await deleteStorageImages(allImages);

    // Delete DB record (cascades to related tables)
    const { error } = await supabase.from("stays").delete().eq("id", deleteId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Stay deleted", description: `Removed ${allImages.length} image(s) from storage.` }); fetchStays(); }
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);

    // Collect all images across selected stays
    const allImages: string[] = [];
    stays.filter((s) => ids.includes(s.id)).forEach((s) => allImages.push(...(s.images || [])));

    // Also fetch room category images for all selected stays
    const { data: rooms } = await supabase
      .from("stay_room_categories")
      .select("images")
      .in("stay_id", ids);
    (rooms || []).forEach((r: any) => allImages.push(...(r.images || [])));

    // Delete storage files first
    await deleteStorageImages(allImages);

    const { error } = await supabase.from("stays").delete().in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `${ids.length} stay(s) deleted`, description: `Removed ${allImages.length} image(s) from storage.` }); setSelectedIds(new Set()); fetchStays(); }
    setBulkDeleteOpen(false);
  };

  const duplicateStay = async (stay: any) => {
    const newStayId = `Stay-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { error } = await (supabase.from("stays") as any).insert({
      stay_id: newStayId,
      name: `${stay.name} (Copy)`,
      location: stay.location,
      description: stay.description,
      category: stay.category,
      rating: 0,
      reviews_count: 0,
      price: stay.price,
      original_price: stay.original_price,
      amenities: stay.amenities,
      images: stay.images,
      status: "hidden",
      tenant_id: tenantId,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Stay duplicated", description: `${stay.name} (Copy) created as hidden.` }); fetchStays(); }
  };

  const copyLink = (stayId: string, stayUuid?: string) => {
    const url = `${window.location.origin}/stay/${stayUuid || stayId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(stayId);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const shareStay = (stay: any) => {
    const url = `${window.location.origin}/stay/${stay.id}`;
    const text = `Check out ${stay.name}${stay.location ? ` in ${stay.location}` : ""} — starting at ${format(stay.price ?? 0)}/night!\n${url}`;
    if (navigator.share) navigator.share({ text, url });
    else { navigator.clipboard.writeText(text); toast({ title: "Copied to clipboard" }); }
  };

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortAsc(s => !s);
    else { setSortKey(key); setSortAsc(true); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  const hasActiveFilters = searchQuery || categoryFilter !== "all" || statusTab !== "all";
  const clearFilters = () => { setSearchQuery(""); setCategoryFilter("all"); setStatusTab("all"); };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" /> Stays Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} total · {stats.live} live · {stats.hidden} hidden
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchStays()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportStaysCSV(filtered, bookingCounts)}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => { setEditStay(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Stay
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Live Stays", value: loading ? "…" : stats.live, icon: Eye, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Total Bookings", value: loading ? "…" : stats.totalBookings, icon: BookOpen, color: "text-primary", bg: "bg-primary/5" },
          { label: "Avg Rating", value: loading ? "…" : `${stats.avgRating} ★`, icon: Star, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
          { label: "Avg Price", value: loading ? "…" : format(stats.avgPrice), icon: IndianRupee, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`${s.bg} border-0`}>
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className={`font-bold text-sm truncate ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="stays" className="w-full">
        <TabsList>
          <TabsTrigger value="stays">All Stays</TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Categories
            {categoryCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">{categoryCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stays" className="space-y-4 mt-4">

          {/* Status Tabs */}
          <Tabs value={statusTab} onValueChange={v => { setStatusTab(v as StatusTab); setSelectedIds(new Set()); }}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Live ({stats.live})</TabsTrigger>
              <TabsTrigger value="draft" className="text-xs">Drafts ({stats.draft})</TabsTrigger>
              <TabsTrigger value="hidden" className="text-xs">Hidden ({stats.hidden})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, ID, location, category..." className="pl-9 h-9" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {categories.length > 1 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-primary/30 bg-primary/5"
              >
                <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2 ml-auto">
                  {Array.from(selectedIds).some(id => stays.find(s => s.id === id)?.status === "draft") && (
                    <Button size="sm" className="h-7 text-xs" disabled={bulkLoading} onClick={bulkPublishDrafts}>
                      <BookOpen className="h-3 w-3 mr-1" /> Publish
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bulkLoading} onClick={() => bulkSetStatus("active")}>
                    <Eye className="h-3 w-3 mr-1" /> Show
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bulkLoading} onClick={() => bulkSetStatus("hidden")}>
                    <EyeOff className="h-3 w-3 mr-1" /> Hide
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setBulkDeleteOpen(true)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox checked={allFilteredSelected && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="w-[100px]">Photo</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold text-xs" onClick={() => sortBy("name")}>
                      Name <SortIcon k="name" />
                    </button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold text-xs" onClick={() => sortBy("price")}>
                      Price <SortIcon k="price" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold text-xs" onClick={() => sortBy("rating")}>
                      Rating <SortIcon k="rating" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold text-xs" onClick={() => sortBy("bookings_count")}>
                      Bookings <SortIcon k="bookings_count" />
                    </button>
                  </TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading stays...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{hasActiveFilters ? "No stays match your filters" : "No stays yet"}</p>
                      {hasActiveFilters ? (
                        <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>
                      ) : (
                        <Button variant="link" size="sm" className="mt-2" onClick={() => { setEditStay(null); setFormOpen(true); }}>Add your first stay</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence initial={false}>
                    {filtered.map((stay, i) => {
                      const bCount = bookingCounts[stay.id] || 0;
                      return (
                        <motion.tr
                          key={stay.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.015 }}
                          className={cn(
                            "border-b last:border-0 hover:bg-muted/30 transition-colors",
                            stay.status !== "active" && "opacity-70",
                            selectedIds.has(stay.id) && "bg-primary/5 opacity-100",
                          )}
                        >
                          <TableCell>
                            <Checkbox checked={selectedIds.has(stay.id)} onCheckedChange={() => toggleSelect(stay.id)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="w-20 h-14 rounded-md overflow-hidden">
                              <StayImageCarousel images={stay.images || []} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">{stay.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{stay.stay_id}</p>
                              {stay.amenities?.length > 0 && (
                                <p className="text-[10px] text-muted-foreground">{stay.amenities.length} amenities</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {stay.category ? <Badge variant="outline" className="text-xs">{stay.category}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {stay.location ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate max-w-[120px]">{stay.location}</span></span> : "—"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">{format(stay.price ?? 0)}</p>
                              {stay.original_price > stay.price && (
                                <p className="text-[10px] text-muted-foreground line-through">{format(stay.original_price ?? 0)}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{stay.rating || "—"}</span>
                              {stay.reviews_count > 0 && (
                                <span className="text-[10px] text-muted-foreground">({stay.reviews_count})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className={cn("text-sm font-medium", bCount > 0 ? "text-foreground" : "text-muted-foreground")}>{bCount}</span>
                              {bCount >= 10 && <TrendingUp className="w-3 h-3 text-green-500" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {stay.status === "draft" ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => publishDraft(stay)}>
                                    Publish
                                  </Button>
                                  <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400">Draft</Badge>
                                </>
                              ) : (
                                <>
                                  <Switch checked={stay.status === "active"} onCheckedChange={() => toggleStatus(stay)} />
                                  <Badge variant={stay.status === "active" ? "default" : "secondary"} className="text-[10px]">
                                    {stay.status === "active" ? "Live" : "Hidden"}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => router.push(`/stay/${stay.id}`)}>
                                  <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Page
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyLink(stay.stay_id, stay.id)}>
                                  {copiedId === stay.stay_id
                                    ? <><Check className="w-3.5 h-3.5 mr-2 text-green-500" /> Copied!</>
                                    : <><Copy className="w-3.5 h-3.5 mr-2" /> Copy Link</>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shareStay(stay)}>
                                  <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                                </DropdownMenuItem>
                                {stay.status === "draft" && (
                                  <DropdownMenuItem onClick={() => publishDraft(stay)}>
                                    <BookOpen className="w-3.5 h-3.5 mr-2" /> Publish
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setEditStay(stay); setFormOpen(true); }}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateStay(stay)}>
                                  <Layers className="w-3.5 h-3.5 mr-2" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteId(stay.id)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading stays...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{hasActiveFilters ? "No stays match" : "No stays yet"}</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((stay, i) => {
                  const bCount = bookingCounts[stay.id] || 0;
                  return (
                    <motion.div
                      key={stay.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn("rounded-xl border bg-card overflow-hidden", stay.status !== "active" && "opacity-60", selectedIds.has(stay.id) && "ring-2 ring-primary opacity-100")}
                    >
                      <div className="h-36 w-full relative">
                        <StayImageCarousel images={stay.images || []} />
                        <div className="absolute top-2 left-2">
                          <Checkbox checked={selectedIds.has(stay.id)} onCheckedChange={() => toggleSelect(stay.id)} className="bg-background/80 border-background" />
                        </div>
                        {stay.status === "draft" && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400">Draft</Badge>
                          </div>
                        )}
                        {stay.status !== "active" && stay.status !== "draft" && (
                          <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                            <Badge variant="secondary" className="text-xs">Hidden</Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{stay.name}</p>
                            {stay.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{stay.location}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              {stay.category && <Badge variant="outline" className="text-[9px] h-4 px-1">{stay.category}</Badge>}
                              {bCount > 0 && <span className="text-[10px] text-muted-foreground">{bCount} bookings</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {stay.status === "draft" ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => publishDraft(stay)}>
                                Publish
                              </Button>
                            ) : (
                              <Switch checked={stay.status === "active"} onCheckedChange={() => toggleStatus(stay)} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-bold">{format(stay.price ?? 0)}</p>
                              {stay.original_price > stay.price && (
                                <p className="text-[10px] text-muted-foreground line-through">{format(stay.original_price ?? 0)}</p>
                              )}
                            </div>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{stay.rating || "—"}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {stay.status === "draft" && (
                                <DropdownMenuItem onClick={() => publishDraft(stay)}>
                                  <BookOpen className="w-3.5 h-3.5 mr-2" /> Publish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => router.push(`/stay/${stay.id}`)}>
                                <ExternalLink className="w-3.5 h-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareStay(stay)}>
                                <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditStay(stay); setFormOpen(true); }}>
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateStay(stay)}>
                                <Layers className="w-3.5 h-3.5 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteId(stay.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Showing {filtered.length} of {stays.length} stay{stays.length !== 1 ? "s" : ""}
            </p>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoriesBuilder />
        </TabsContent>
      </Tabs>

      <StayForm open={formOpen} onOpenChange={setFormOpen} stay={editStay} onSaved={fetchStays} />

      {/* Delete Single Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stay?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{stays.find(s => s.id === deleteId)?.name}</strong> and all associated room categories, reels, nearby destinations, and reviews.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Stay{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected stays and all their associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size} stay{selectedIds.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
