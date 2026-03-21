import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookingDetailDialog } from "@/components/admin/BookingDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ToastAction } from "@/components/ui/toast";
import {
  Search, FileText, Receipt, CalendarIcon, Download, MoreHorizontal,
  RefreshCw, CalendarCheck, CalendarClock, Clock,
  IndianRupee, ChevronDown, ChevronUp, XCircle,
  MessageCircle, Phone, Copy, Check,
  BookOpen, CheckCircle2, X as XIcon,
} from "lucide-react";
import { format, differenceInDays, isToday, isTomorrow, isPast, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPhoneForWhatsApp } from "@/lib/countryCodes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StayMap {
  [id: string]: { name: string; stay_id: string };
}

type StatusTab = "all" | "pending" | "confirmed" | "cancelled";
type SortKey = "created_at" | "checkin" | "checkout" | "total_price" | "guest_name";

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "text-yellow-600", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-green-600", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-500", variant: "destructive", icon: XIcon },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNights(checkin: string | null, checkout: string | null): number {
  if (!checkin || !checkout) return 0;
  return Math.max(0, differenceInDays(parseISO(checkout), parseISO(checkin)));
}

function getStayLabel(checkin: string | null, checkout: string | null): { label: string; className: string } | null {
  if (!checkin || !checkout) return null;
  const ci = parseISO(checkin);
  const co = parseISO(checkout);
  const today = new Date();
  if (isToday(ci)) return { label: "Arriving today", className: "bg-blue-500/10 text-blue-600 border-blue-200" };
  if (isTomorrow(ci)) return { label: "Arriving tomorrow", className: "bg-blue-500/10 text-blue-500 border-blue-200" };
  if (isToday(co)) return { label: "Departing today", className: "bg-orange-500/10 text-orange-600 border-orange-200" };
  if (ci <= today && co > today) return { label: "Currently staying", className: "bg-green-500/10 text-green-600 border-green-200" };
  if (isPast(co)) return { label: "Completed", className: "bg-gray-500/10 text-gray-500 border-gray-200" };
  return null;
}

function exportBookingsCSV(bookings: any[], stays: StayMap) {
  const headers = ["Booking ID", "Stay", "Guest", "Phone", "Email", "Adults", "Children", "Pets", "Check-in", "Check-out", "Nights", "Rooms", "Add-ons", "Coupon", "Total", "Status", "Special Requests", "Created"];
  const rows = bookings.map(b => {
    const stayName = b.stay_id && stays[b.stay_id] ? stays[b.stay_id].name : "";
    const rooms = Array.isArray(b.rooms) ? b.rooms.map((r: any) => `${r.name}×${r.count}`).join("; ") : "";
    const addons = Array.isArray(b.addons) ? b.addons.map((a: any) => a.label).join("; ") : "";
    return [
      b.booking_id, stayName, b.guest_name, b.phone, b.email || "",
      b.adults || 1, b.children || 0, b.pets || 0,
      b.checkin || "", b.checkout || "", getNights(b.checkin, b.checkout),
      rooms, addons, b.coupon_code || "", b.total_price || 0, b.status,
      b.special_requests || "", b.created_at ? format(parseISO(b.created_at), "yyyy-MM-dd HH:mm") : "",
    ];
  });
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function whatsappUrl(phone: string, guestName: string, bookingId: string, countryCode?: string) {
  const num = formatPhoneForWhatsApp(phone, countryCode);
  const text = encodeURIComponent(`Hi ${guestName}, regarding your booking ${bookingId} — `);
  return `https://wa.me/${num}?text=${text}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [stays, setStays] = useState<StayMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [stayFilter, setStayFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("confirmed");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const { toast } = useToast();
  const { settings: siteSettings } = useSiteSettings();
  const router = useRouter();

  const fetchBookings = useCallback(async () => {
    const [{ data: bk }, { data: st }] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name, stay_id"),
    ]);
    if (bk) setBookings(bk);
    if (st) {
      const map: StayMap = {};
      st.forEach((s: any) => { map[s.id] = { name: s.name, stay_id: s.stay_id }; });
      setStays(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  // ── Filtered + sorted ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...bookings];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.booking_id?.toLowerCase().includes(q) ||
        b.guest_name?.toLowerCase().includes(q) ||
        b.phone?.includes(q) ||
        (b.stay_id && stays[b.stay_id]?.name?.toLowerCase().includes(q))
      );
    }

    if (statusTab !== "all") list = list.filter(b => b.status === statusTab);
    if (stayFilter !== "all") list = list.filter(b => b.stay_id === stayFilter);

    if (dateFrom) {
      list = list.filter(b => b.checkin && parseISO(b.checkin) >= startOfDay(dateFrom));
    }
    if (dateTo) {
      list = list.filter(b => b.checkin && parseISO(b.checkin) <= endOfDay(dateTo));
    }

    list.sort((a, b) => {
      let va: any = a[sortKey] ?? "";
      let vb: any = b[sortKey] ?? "";
      if (sortKey === "checkin" || sortKey === "checkout" || sortKey === "created_at") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (sortKey === "total_price") { va = va || 0; vb = vb || 0; }
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [bookings, search, statusTab, stayFilter, sortKey, sortAsc, stays, dateFrom, dateTo]);

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    let pending = 0, confirmed = 0, cancelled = 0, revenue = 0;
    let arrivingToday = 0, departingToday = 0;

    for (const b of bookings) {
      if (b.status === "pending") pending++;
      else if (b.status === "confirmed") { confirmed++; revenue += b.total_price || 0; }
      else if (b.status === "cancelled") cancelled++;
      if (b.checkin === todayStr && b.status !== "cancelled") arrivingToday++;
      if (b.checkout === todayStr && b.status !== "cancelled") departingToday++;
    }

    return { total: bookings.length, pending, confirmed, cancelled, revenue, arrivingToday, departingToday };
  }, [bookings]);

  // ── Unique stays for filter ───────────────────────────────────────────

  const stayOptions = useMemo(() => {
    const ids = new Set(bookings.map(b => b.stay_id).filter(Boolean));
    return Array.from(ids).map(id => ({ id, name: stays[id]?.name || id })).sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings, stays]);

  // ── Selection ─────────────────────────────────────────────────────────

  const allFilteredSelected = filtered.length > 0 && filtered.every(b => selectedIds.has(b.id));
  const toggleSelectAll = () => {
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(b => b.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Handlers ──────────────────────────────────────────────────────────

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (status === "confirmed" && siteSettings?.auto_generate_invoice) {
      const booking = bookings.find((b) => b.id === id);
      if (booking) {
        const invoiceId = await createInvoice(booking);
        if (invoiceId) {
          toast({
            title: "Booking confirmed",
            description: `Invoice ${invoiceId} created`,
            action: (
              <ToastAction altText="View Invoice" onClick={() => router.push("/admin/invoices")}>
                View Invoice
              </ToastAction>
            ),
          });
          return;
        }
      }
    }

    toast({ title: `Booking ${status}` });
  };

  const handleBulkStatus = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("bookings").update({ status: bulkStatus }).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${ids.length} booking(s) marked as ${bulkStatus}` });
      setSelectedIds(new Set());
      fetchBookings();
    }
    setBulkStatusOpen(false);
  };

  const createQuotation = async (booking: any) => {
    const quoteId = `Q-${Date.now().toString(36).toUpperCase()}`;
    const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];
    const addons = Array.isArray(booking.addons) ? booking.addons : [];
    const roomTotal = rooms.reduce((s: number, r: any) => s + (r.price || 0) * (r.count || 1), 0);
    const addonsTotal = addons.reduce((s: number, a: any) => s + (a.price || 0), 0);

    const { error } = await supabase.from("quotations").insert({
      quote_id: quoteId,
      guest_name: booking.guest_name,
      phone: booking.phone,
      email: booking.email,
      stay_id: booking.stay_id,
      tenant_id: booking.tenant_id,
      checkin: booking.checkin,
      checkout: booking.checkout,
      rooms: booking.rooms,
      addons: booking.addons,
      room_total: roomTotal,
      addons_total: addonsTotal,
      total_price: booking.total_price,
      coupon_code: booking.coupon_code,
      special_requests: booking.special_requests,
      status: "draft",
    });

    if (error) toast({ title: "Error creating quotation", description: error.message, variant: "destructive" });
    else toast({ title: "Quotation created", description: `${quoteId} for ${booking.guest_name}` });
  };

  const createInvoice = async (booking: any): Promise<string | null> => {
    const { data: existing } = await supabase
      .from("invoices")
      .select("invoice_id")
      .eq("booking_id", booking.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Invoice already exists",
        description: `${existing.invoice_id} for this booking`,
        action: (
          <ToastAction altText="View Invoice" onClick={() => router.push("/admin/invoices")}>
            View Invoice
          </ToastAction>
        ),
      });
      return existing.invoice_id;
    }

    const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;
    const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];
    const addons = Array.isArray(booking.addons) ? booking.addons : [];
    const roomTotal = rooms.reduce((s: number, r: any) => s + (r.price || 0) * (r.count || 1), 0);
    const addonsTotal = addons.reduce((s: number, a: any) => s + (a.price || 0), 0);

    const { error } = await supabase.from("invoices").insert({
      invoice_id: invoiceId,
      booking_id: booking.id,
      guest_name: booking.guest_name,
      phone: booking.phone,
      email: booking.email,
      stay_id: booking.stay_id,
      tenant_id: booking.tenant_id,
      checkin: booking.checkin,
      checkout: booking.checkout,
      rooms: booking.rooms,
      addons: booking.addons,
      room_total: roomTotal,
      addons_total: addonsTotal,
      total_price: booking.total_price,
      coupon_code: booking.coupon_code,
      payment_status: "pending",
    });

    if (error) {
      toast({ title: "Error creating invoice", description: error.message, variant: "destructive" });
      return null;
    }
    return invoiceId;
  };

  const copyBookingId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortAsc(s => !s);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  const clearFilters = () => {
    setSearch("");
    setStatusTab("all");
    setStayFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = search || statusTab !== "all" || stayFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Bookings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {stats.total} total · {stats.pending} pending
            {stats.arrivingToday > 0 && <span className="text-blue-500 ml-1">· {stats.arrivingToday} arriving today</span>}
            {stats.departingToday > 0 && <span className="text-orange-500 ml-1">· {stats.departingToday} departing</span>}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fetchBookings()} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportBookingsCSV(filtered, stays)}>
            <Download className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Revenue", value: loading ? "…" : `₹${stats.revenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Pending", value: loading ? "…" : stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
          { label: "Arriving", value: loading ? "…" : stats.arrivingToday, icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Departing", value: loading ? "…" : stats.departingToday, icon: CalendarClock, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`${s.bg} border-0`}>
              <CardContent className="p-2.5 flex items-center gap-2.5">
                <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                  <p className={`font-bold text-xs sm:text-sm truncate ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status Tabs — scrollable on mobile */}
      <div className="overflow-x-auto -mx-1 px-1">
        <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as StatusTab); setSelectedIds(new Set()); }}>
          <TabsList className="h-8 sm:h-9 w-max sm:w-auto">
            <TabsTrigger value="all" className="text-[11px] sm:text-xs px-2.5">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending" className="text-[11px] sm:text-xs px-2.5">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="confirmed" className="text-[11px] sm:text-xs px-2.5">Confirmed ({stats.confirmed})</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-[11px] sm:text-xs px-2.5">Cancelled ({stats.cancelled})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ID, guest, phone, stay..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs sm:text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {stayOptions.length > 1 && (
            <Select value={stayFilter} onValueChange={setStayFilter}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                <SelectValue placeholder="All Stays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stays</SelectItem>
                {stayOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DateRangePicker from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground h-8 shrink-0">
              <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setBulkStatus("confirmed"); setBulkStatusOpen(true); }}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setBulkStatus("cancelled"); setBulkStatusOpen(true); }}>
              <XIcon className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Select All (desktop/tablet) ──────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            className="shrink-0"
            checked={allFilteredSelected && filtered.length > 0}
            onCheckedChange={() => toggleSelectAll()}
          />
          <span className="text-xs text-muted-foreground">
            {allFilteredSelected ? "Deselect all" : `Select all ${filtered.length}`}
          </span>
          <div className="hidden sm:flex items-center gap-1.5 ml-auto text-[10px] text-muted-foreground">
            {(["created_at", "guest_name", "checkin", "total_price"] as const).map(k => (
              <button
                key={k}
                onClick={() => sortBy(k)}
                className={cn(
                  "flex items-center gap-0.5 px-2 py-1 rounded-md transition-colors",
                  sortKey === k ? "bg-muted font-semibold text-foreground" : "hover:bg-muted/60"
                )}
              >
                {k === "created_at" ? "Date" : k === "guest_name" ? "Name" : k === "checkin" ? "Check-in" : "Price"}
                <SortIcon k={k} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Booking Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading bookings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No bookings found</p>
            {hasActiveFilters && <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>}
          </div>
        ) : filtered.map((b, i) => {
          const stayInfo = b.stay_id ? stays[b.stay_id] : null;
          const nights = getNights(b.checkin, b.checkout);
          const stayBadge = getStayLabel(b.checkin, b.checkout);

          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                "rounded-xl border bg-card hover:shadow-md transition-shadow",
                selectedIds.has(b.id) && "ring-2 ring-primary",
              )}
            >
              {/* Header: guest + price + checkbox */}
              <div className="p-3 pb-2 flex items-start gap-2 cursor-pointer" onClick={() => setSelected(b)}>
                <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(b.id)}
                    onCheckedChange={() => toggleSelect(b.id)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{b.guest_name}</p>
                    <span className="font-bold text-sm text-primary shrink-0 tabular-nums">₹{(b.total_price || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">{b.booking_id}</span>
                    {stayInfo && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground truncate">{stayInfo.name}</span>
                      </>
                    )}
                  </div>
                  {b.phone && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{b.phone}</p>
                  )}
                </div>
              </div>

              {/* Dates + badges */}
              <div className="px-3 pb-2 cursor-pointer" onClick={() => setSelected(b)}>
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium">{b.checkin ? format(parseISO(b.checkin), "dd MMM yy") : "—"}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs font-medium">{b.checkout ? format(parseISO(b.checkout), "dd MMM yy") : "—"}</span>
                  {nights > 0 && <span className="text-[10px] text-muted-foreground">({nights}N)</span>}
                  {stayBadge && b.status !== "cancelled" && (
                    <Badge variant="outline" className={cn("text-[8px] py-0 px-1 ml-auto", stayBadge.className)}>{stayBadge.label}</Badge>
                  )}
                </div>
                {/* Traveller & tag badges */}
                {(b.coupon_code || b.solo_traveller || b.group_booking) && (
                  <div className="flex items-center gap-1 flex-wrap mt-1.5">
                    {b.coupon_code && <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30">🏷 {b.coupon_code}</Badge>}
                    {b.solo_traveller && <Badge variant="outline" className="text-[8px] py-0 px-1.5">Solo</Badge>}
                    {b.group_booking && <Badge variant="outline" className="text-[8px] py-0 px-1.5">Group{b.group_name ? `: ${b.group_name}` : ""}</Badge>}
                    {!b.solo_traveller && (b.adults || b.children > 0 || b.pets > 0) && (
                      <Badge variant="outline" className="text-[8px] py-0 px-1.5 ml-auto">
                        {b.adults || 2}A{b.children > 0 ? ` ${b.children}C` : ""}{b.pets > 0 ? ` ${b.pets}P` : ""}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="border-t bg-muted/20 px-2.5 py-2 space-y-1.5">
                {/* Status row */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(["pending", "confirmed", "cancelled"] as const).map(st => {
                    const conf = STATUS_CONFIG[st];
                    const isActive = b.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => { if (!isActive) updateStatus(b.id, st); }}
                        className={cn(
                          "flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                          isActive
                            ? st === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : st === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        <conf.icon className="w-3 h-3" />
                        {conf.label}
                      </button>
                    );
                  })}
                </div>

                {/* Quick actions row */}
                <div className="flex items-center gap-1.5">
                  <a
                    href={whatsappUrl(b.phone, b.guest_name, b.booking_id, b.phone_country_code)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-8 rounded-lg bg-green-500/10 flex items-center justify-center gap-1.5 hover:bg-green-500/20 active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] font-medium text-green-600">WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${b.phone}`}
                    className="flex-1 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center gap-1.5 hover:bg-blue-500/20 active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-medium text-blue-600">Call</span>
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 px-3 rounded-lg bg-muted flex items-center justify-center gap-1.5 hover:bg-muted/80 active:scale-95 transition-all shrink-0">
                        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setSelected(b)}><BookOpen className="w-3.5 h-3.5 mr-2" /> Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyBookingId(b.booking_id)}>
                        {copiedId === b.booking_id ? <Check className="w-3.5 h-3.5 mr-2 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => createQuotation(b)}><FileText className="w-3.5 h-3.5 mr-2" /> Quotation</DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        const invId = await createInvoice(b);
                        if (invId) {
                          toast({
                            title: "Invoice created",
                            description: `${invId} for ${b.guest_name}`,
                            action: (
                              <ToastAction altText="View Invoice" onClick={() => router.push("/admin/invoices")}>
                                View Invoice
                              </ToastAction>
                            ),
                          });
                        }
                      }}><Receipt className="w-3.5 h-3.5 mr-2" /> Invoice</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          {filtered.length > 0 && ` · ₹${filtered.reduce((s, b) => s + (b.total_price || 0), 0).toLocaleString("en-IN")} total`}
        </p>
      )}

      {/* Detail Dialog */}
      <BookingDetailDialog
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        booking={selected}
        stayInfo={selected?.stay_id ? stays[selected.stay_id] : null}
        onStatusChange={(status) => { if (selected) updateStatus(selected.id, status); }}
        onCreateQuotation={() => { if (selected) createQuotation(selected); }}
        onCreateInvoice={async () => {
          if (selected) {
            const invId = await createInvoice(selected);
            if (invId) {
              toast({
                title: "Invoice created",
                description: `${invId} for ${selected.guest_name}`,
                action: (
                  <ToastAction altText="View Invoice" onClick={() => router.push("/admin/invoices")}>
                    View Invoice
                  </ToastAction>
                ),
              });
            }
          }
        }}
      />

      {/* Bulk Status Dialog */}
      <AlertDialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update {selectedIds.size} Booking{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedIds.size} booking{selectedIds.size !== 1 ? "s" : ""} as <strong>{bulkStatus}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatus}>
              Update {selectedIds.size} booking{selectedIds.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({ from, to, onFromChange, onToChange }: {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = from && to
    ? `${format(from, "dd MMM")} – ${format(to, "dd MMM")}`
    : from
      ? `From ${format(from, "dd MMM")}`
      : "Date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", (from || to) && "text-primary border-primary/30")}>
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="text-xs">{label}</span>
          {(from || to) && (
            <button
              onClick={e => { e.stopPropagation(); onFromChange(undefined); onToChange(undefined); }}
              className="ml-1 rounded-full hover:bg-muted p-0.5"
            >
              <XCircle className="w-3 h-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3" align="start">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">From</p>
            <Calendar mode="single" selected={from} onSelect={onFromChange} initialFocus />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">To</p>
            <Calendar mode="single" selected={to} onSelect={onToChange} disabled={from ? (d) => d < from : undefined} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => { onFromChange(undefined); onToChange(undefined); }}>Clear</Button>
          <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
