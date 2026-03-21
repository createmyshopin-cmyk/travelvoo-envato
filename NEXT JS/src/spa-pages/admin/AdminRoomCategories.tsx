import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Search, BedDouble, Users, IndianRupee,
  MoreHorizontal, Copy, ChevronUp, ChevronDown, Download,
  Sparkles, Eye, Package, TrendingUp, X, Filter, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomCategory {
  id: string;
  stay_id: string;
  name: string;
  max_guests: number;
  available: number;
  amenities: string[];
  price: number;
  original_price: number;
  images: string[];
}

interface RoomRow extends RoomCategory {
  stay_name: string;
  booking_count: number;
}

interface StayOption {
  id: string;
  name: string;
  stay_id: string;
  tenant_id: string | null;
}

interface RoomForm {
  stay_id: string;
  name: string;
  max_guests: number;
  available: number;
  amenities: string;
  price: number;
  original_price: number;
}

const emptyForm: RoomForm = { stay_id: "", name: "", max_guests: 2, available: 1, amenities: "", price: 0, original_price: 0 };

type SortKey = "name" | "price" | "available" | "max_guests" | "booking_count";
type SortDir = "asc" | "desc";

const COMMON_AMENITIES = [
  "AC", "Wi-Fi", "TV", "Geyser", "Balcony", "Sea View", "Mountain View",
  "Attached Bathroom", "Room Service", "Mini Fridge", "Wardrobe", "Desk",
  "King Bed", "Twin Beds", "Sofa", "Kettle", "Hair Dryer", "Iron",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminRoomCategories() {
  const { format, formatCompact, symbol } = useCurrency();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [stays, setStays] = useState<StayOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomCategory | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [stayFilter, setStayFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const { toast } = useToast();

  // ── Fetch ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [roomsRes, staysRes, bookingsRes] = await Promise.all([
      supabase.from("room_categories").select("*").order("name"),
      supabase.from("stays").select("id, name, stay_id, tenant_id").order("name"),
      supabase.from("bookings").select("rooms, stay_id, status").in("status", ["pending", "confirmed"]),
    ]);

    const staysData = (staysRes.data || []) as StayOption[];
    setStays(staysData);
    const stayMap = Object.fromEntries(staysData.map((s) => [s.id, s.name]));

    const bookingCountMap: Record<string, number> = {};
    for (const b of bookingsRes.data || []) {
      if (Array.isArray(b.rooms)) {
        for (const r of b.rooms as any[]) {
          const key = `${b.stay_id}_${r.name}`;
          bookingCountMap[key] = (bookingCountMap[key] || 0) + (r.count || 1);
        }
      }
    }

    setRooms(
      (roomsRes.data || []).map((r: any) => ({
        ...r,
        stay_name: stayMap[r.stay_id] || "Unknown",
        booking_count: bookingCountMap[`${r.stay_id}_${r.name}`] || 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("room_categories_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "room_categories" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // ── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((s, r) => s + r.available, 0);
    const avgPrice = totalRooms > 0 ? Math.round(rooms.reduce((s, r) => s + r.price, 0) / totalRooms) : 0;
    const totalBookings = rooms.reduce((s, r) => s + r.booking_count, 0);
    const topRoom = [...rooms].sort((a, b) => b.booking_count - a.booking_count)[0];
    return { totalRooms, totalCapacity, avgPrice, totalBookings, topRoom };
  }, [rooms]);

  // ── Filter + Sort ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = rooms;
    if (stayFilter !== "all") result = result.filter((r) => r.stay_id === stayFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.stay_name.toLowerCase().includes(q) ||
        r.amenities.some((a) => a.toLowerCase().includes(q))
      );
    }
    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return result;
  }, [rooms, stayFilter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // ── Selection ────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  // ── CRUD ─────────────────────────────────────────────────────────────

  const openForm = (room?: RoomCategory) => {
    if (room) {
      setEditRoom(room);
      setForm({
        stay_id: room.stay_id,
        name: room.name,
        max_guests: room.max_guests,
        available: room.available,
        amenities: room.amenities.join(", "),
        price: room.price,
        original_price: room.original_price,
      });
    } else {
      setEditRoom(null);
      setForm({ ...emptyForm, stay_id: stayFilter !== "all" ? stayFilter : "" });
    }
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.stay_id) errs.stay_id = "Select a stay";
    if (!form.name.trim()) errs.name = "Room name is required";
    if (form.price <= 0) errs.price = "Price must be > 0";
    if (form.max_guests < 1) errs.max_guests = "Min 1 guest";
    if (form.available < 0) errs.available = "Cannot be negative";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);

    const stay = stays.find((s) => s.id === form.stay_id);
    if (!stay?.tenant_id) {
      toast({
        title: "Error",
        description: "Could not resolve tenant for this stay. Refresh the page or ensure the stay is linked to your account.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const payload = {
      stay_id: form.stay_id,
      tenant_id: stay.tenant_id,
      name: form.name.trim(),
      max_guests: form.max_guests,
      available: form.available,
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      price: form.price,
      original_price: form.original_price || form.price,
    };

    let error;
    if (editRoom) {
      ({ error } = await supabase.from("room_categories").update(payload).eq("id", editRoom.id));
    } else {
      ({ error } = await supabase.from("room_categories").insert([payload]));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editRoom ? "Room updated" : "Room created" });
      fetchData();
      setFormOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("room_categories").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Room deleted" });
      setSelected((prev) => { const n = new Set(prev); n.delete(deleteId); return n; });
      fetchData();
    }
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await supabase.from("room_categories").delete().eq("id", id);
    }
    toast({ title: `${ids.length} room(s) deleted` });
    setSelected(new Set());
    setBulkDeleteOpen(false);
    fetchData();
  };

  const duplicateRoom = async (room: RoomRow) => {
    const stay = stays.find((s) => s.id === room.stay_id);
    if (!stay?.tenant_id) {
      toast({
        title: "Error",
        description: "Could not resolve tenant for this stay.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      stay_id: room.stay_id,
      tenant_id: stay.tenant_id,
      name: `${room.name} (Copy)`,
      max_guests: room.max_guests,
      available: room.available,
      amenities: room.amenities,
      price: room.price,
      original_price: room.original_price,
      images: room.images,
    };
    const { error } = await supabase.from("room_categories").insert([payload]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Room duplicated" }); fetchData(); }
  };

  // ── CSV ──────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["Name", "Stay", "Max Guests", "Available", "Price", "Original Price", "Amenities", "Bookings"];
    const rows = filtered.map((r) => [
      r.name, r.stay_name, r.max_guests, r.available, r.price, r.original_price, r.amenities.join("; "), r.booking_count,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `rooms-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  // ── Amenity toggle in form ───────────────────────────────────────────

  const toggleAmenity = (amenity: string) => {
    const current = form.amenities.split(",").map((a) => a.trim()).filter(Boolean);
    const next = current.includes(amenity) ? current.filter((a) => a !== amenity) : [...current, amenity];
    setForm({ ...form, amenities: next.join(", ") });
  };

  const currentAmenities = form.amenities.split(",").map((a) => a.trim()).filter(Boolean);

  const getDiscountPct = (price: number, original: number) => {
    if (!original || original <= price) return 0;
    return Math.round(((original - price) / original) * 100);
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BedDouble className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Room Categories
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {stats.totalRooms} categories · {stats.totalCapacity} total rooms
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={exportCSV}>
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
          <Button size="sm" className="text-xs h-8" onClick={() => openForm()}>
            <Plus className="mr-1 h-3 w-3" /> Add Room
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Categories", value: stats.totalRooms, icon: BedDouble, color: "text-primary", bg: "bg-primary/5" },
          { label: "Total Capacity", value: stats.totalCapacity, icon: Package, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Avg Price", value: stats.avgPrice > 0 ? format(stats.avgPrice) : "—", icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Active Bookings", value: stats.totalBookings, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`${s.bg} border-0`}>
              <CardContent className="p-2.5 flex items-center gap-2.5">
                <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                  <p className={`font-bold text-xs sm:text-sm ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Top performer */}
      {stats.topRoom && stats.topRoom.booking_count > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Top room: <strong>{stats.topRoom.name}</strong> ({stats.topRoom.stay_name}) — {stats.topRoom.booking_count} bookings
          </span>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search rooms, stays, amenities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={stayFilter} onValueChange={setStayFilter}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm">
            <Filter className="w-3 h-3 mr-1 opacity-50" />
            <SelectValue placeholder="All Stays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stays</SelectItem>
            {stays.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <Badge variant="secondary" className="text-xs">{selected.size} selected</Badge>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Table (Desktop) ──────────────────────────────────────────── */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-3 text-left w-8">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="p-3 text-left">
                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort("name")}>
                  Room <SortIcon col="name" />
                </button>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Stay</th>
              <th className="p-3 text-center">
                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mx-auto" onClick={() => toggleSort("max_guests")}>
                  Guests <SortIcon col="max_guests" />
                </button>
              </th>
              <th className="p-3 text-center">
                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mx-auto" onClick={() => toggleSort("available")}>
                  Avail. <SortIcon col="available" />
                </button>
              </th>
              <th className="p-3 text-right">
                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground ml-auto" onClick={() => toggleSort("price")}>
                  Price <SortIcon col="price" />
                </button>
              </th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Amenities</th>
              <th className="p-3 text-center">
                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mx-auto" onClick={() => toggleSort("booking_count")}>
                  Bookings <SortIcon col="booking_count" />
                </button>
              </th>
              <th className="p-3 text-right text-xs font-medium text-muted-foreground w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">Loading rooms...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                {search || stayFilter !== "all" ? "No rooms match your filters" : "No room categories yet"}
              </td></tr>
            ) : filtered.map((r, i) => {
              const disc = getDiscountPct(r.price, r.original_price);
              return (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "border-b last:border-0 hover:bg-muted/30 transition-colors",
                    selected.has(r.id) && "bg-primary/5",
                  )}
                >
                  <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BedDouble className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{r.name}</p>
                        {r.images.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">{r.images.length} photo{r.images.length !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px] font-normal max-w-[120px] truncate">{r.stay_name}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{r.max_guests}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        r.available === 0 ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                        r.available <= 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      )}
                    >
                      {r.available}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="text-right">
                      <span className="font-semibold text-sm">{format(r.price)}</span>
                      {disc > 0 && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[10px] text-muted-foreground line-through">{format(r.original_price)}</span>
                          <Badge className="text-[9px] px-1 py-0 bg-emerald-500 text-white">{disc}% off</Badge>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {r.amenities.slice(0, 3).map((a) => (
                        <Badge key={a} variant="outline" className="text-[9px] font-normal">{a}</Badge>
                      ))}
                      {r.amenities.length > 3 && (
                        <Badge variant="outline" className="text-[9px] font-normal">+{r.amenities.length - 3}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={cn(
                      "text-xs font-semibold",
                      r.booking_count > 0 ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      {r.booking_count}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openForm(r)}><Pencil className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateRoom(r)}><Copy className="w-3 h-3 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const stayRow = stays.find((s) => s.id === r.stay_id);
                          if (stayRow) window.open(`/stay/${r.stay_id}`, "_blank");
                        }}>
                          <Eye className="w-3 h-3 mr-2" /> View Stay
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="w-3 h-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Cards (Mobile) ──────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading rooms...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {search || stayFilter !== "all" ? "No rooms match" : "No room categories yet"}
          </div>
        ) : filtered.map((r, i) => {
          const disc = getDiscountPct(r.price, r.original_price);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "rounded-xl border bg-card p-3 space-y-2.5",
                selected.has(r.id) && "ring-2 ring-primary"
              )}
            >
              {/* Top row */}
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex items-center">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BedDouble className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{r.name}</p>
                      <Badge variant="outline" className="text-[9px] font-normal mt-0.5">{r.stay_name}</Badge>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => openForm(r)}><Pencil className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateRoom(r)}><Copy className="w-3 h-3 mr-2" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="w-3 h-3 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg py-1.5">
                  <p className="text-[9px] text-muted-foreground">Guests</p>
                  <p className="text-xs font-bold">{r.max_guests}</p>
                </div>
                <div className="bg-muted/50 rounded-lg py-1.5">
                  <p className="text-[9px] text-muted-foreground">Avail.</p>
                  <p className={cn("text-xs font-bold", r.available === 0 ? "text-red-600" : r.available <= 2 ? "text-amber-600" : "text-emerald-600")}>
                    {r.available}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg py-1.5">
                  <p className="text-[9px] text-muted-foreground">Price</p>
                  <p className="text-xs font-bold">{formatCompact(r.price)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg py-1.5">
                  <p className="text-[9px] text-muted-foreground">Bookings</p>
                  <p className={cn("text-xs font-bold", r.booking_count > 0 ? "text-amber-600" : "text-muted-foreground")}>{r.booking_count}</p>
                </div>
              </div>

              {/* Discount badge */}
              {disc > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground line-through">{format(r.original_price)}</span>
                  <Badge className="text-[9px] px-1 py-0 bg-emerald-500 text-white">{disc}% off</Badge>
                </div>
              )}

              {/* Amenities */}
              {r.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.amenities.slice(0, 4).map((a) => (
                    <Badge key={a} variant="outline" className="text-[8px] font-normal px-1.5 py-0">{a}</Badge>
                  ))}
                  {r.amenities.length > 4 && (
                    <Badge variant="outline" className="text-[8px] font-normal px-1.5 py-0">+{r.amenities.length - 4}</Badge>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Showing {filtered.length} of {rooms.length} room{rooms.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ─── Room Form Dialog ─────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-primary" />
              {editRoom ? "Edit Room Category" : "Add Room Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stay */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Stay</Label>
              <Select value={form.stay_id} onValueChange={(v) => { setForm({ ...form, stay_id: v }); setFormErrors((p) => ({ ...p, stay_id: "" })); }}>
                <SelectTrigger className={cn("h-9", formErrors.stay_id && "ring-2 ring-destructive")}>
                  <SelectValue placeholder="Select stay" />
                </SelectTrigger>
                <SelectContent>
                  {stays.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.stay_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.stay_id && <p className="text-[10px] text-destructive">{formErrors.stay_id}</p>}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Room Name</Label>
              <Input
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors((p) => ({ ...p, name: "" })); }}
                placeholder="e.g. Deluxe Room, Mountain Suite"
                className={cn("h-9", formErrors.name && "ring-2 ring-destructive")}
              />
              {formErrors.name && <p className="text-[10px] text-destructive">{formErrors.name}</p>}
            </div>

            {/* Guests + Available */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_guests}
                  onChange={(e) => setForm({ ...form, max_guests: Number(e.target.value) })}
                  className={cn("h-9", formErrors.max_guests && "ring-2 ring-destructive")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Available Rooms</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.available}
                  onChange={(e) => setForm({ ...form, available: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Price + Original */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Price ({symbol})</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => { setForm({ ...form, price: Number(e.target.value) }); setFormErrors((p) => ({ ...p, price: "" })); }}
                  className={cn("h-9", formErrors.price && "ring-2 ring-destructive")}
                />
                {formErrors.price && <p className="text-[10px] text-destructive">{formErrors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Original Price ({symbol})</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.original_price}
                  onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })}
                  className="h-9"
                />
                {form.original_price > form.price && form.price > 0 && (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    {getDiscountPct(form.price, form.original_price)}% discount
                  </p>
                )}
              </div>
            </div>

            {/* Quick amenities */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Amenities</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_AMENITIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium border transition-all",
                      currentAmenities.includes(a)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border hover:border-primary/50"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <Input
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                placeholder="AC, Wi-Fi, TV (or click above)"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" size="sm" disabled={saving} className="flex-1">
                {saving ? "Saving..." : editRoom ? "Update Room" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this room category. Active bookings referencing it may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Delete Dialog ───────────────────────────────────────── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} Room{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected room categories. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selected.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
