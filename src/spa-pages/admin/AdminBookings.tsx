import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  BookOpen, CheckCircle2, X as XIcon, Luggage,
} from "lucide-react";
import { format as formatDate, differenceInDays, isToday, isTomorrow, isPast, parseISO, isWithinInterval, startOfDay, endOfDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPhoneForWhatsApp } from "@/lib/countryCodes";
import { useCurrency } from "@/context/CurrencyContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, Settings, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StayMap {
  [id: string]: { name: string; stay_id: string };
}

type StatusTab = "all" | "pending" | "confirmed" | "cancelled" | "enquiries";
type SortKey = "created_at" | "checkin" | "checkout" | "total_price" | "guest_name";

/** Trip/package enquiries stored in `leads` with source `trip_booking` */
const PACKAGE_BOOKING_LEAD_SOURCE = "trip_booking";

/** Map lead workflow status → booking-style tab filter */
function leadStatusToBookingTab(leadStatus: string): "pending" | "confirmed" | "cancelled" {
  if (leadStatus === "converted") return "confirmed";
  if (leadStatus === "lost") return "cancelled";
  return "pending";
}

/** Map booking UI status → `leads.status` */
function bookingTabToLeadStatus(tab: "pending" | "confirmed" | "cancelled"): string {
  if (tab === "confirmed") return "converted";
  if (tab === "cancelled") return "lost";
  return "new";
}

function mapPackageLeadToRow(lead: any, tripNames: Record<string, string>) {
  const meta =
    lead.meta && typeof lead.meta === "object" && !Array.isArray(lead.meta)
      ? (lead.meta as Record<string, unknown>)
      : {};
  const tripId = meta.trip_id as string | undefined;
  const tabStatus = leadStatusToBookingTab(lead.status || "new");
  const ref = (meta.booking_ref as string) || `PKG-${String(lead.id).slice(0, 8)}`;
  return {
    _rowType: "package_lead" as const,
    _leadId: lead.id as string,
    _selectionKey: `pkg:${lead.id}` as string,
    id: lead.id as string,
    booking_id: ref,
    guest_name: lead.full_name,
    phone: lead.phone,
    email: lead.email || "",
    stay_id: null,
    checkin: (meta.start_date as string) || null,
    checkout: (meta.end_date as string) || null,
    total_price: Number(meta.quoted_price) || 0,
    status: tabStatus,
    _leadStatus: lead.status,
    adults: typeof meta.adults === "number" ? meta.adults : 2,
    children: typeof meta.children === "number" ? meta.children : 0,
    created_at: lead.created_at,
    package_message: lead.message as string,
    trip_display_name: (tripId && tripNames[tripId]) || (meta.slug as string) || "Package",
    meta,
  };
}

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
  const headers = ["Type", "Booking ID", "Stay / Package", "Guest", "Phone", "Email", "Adults", "Children", "Pets", "Check-in", "Check-out", "Nights", "Rooms", "Add-ons", "Coupon", "Total", "Status", "Special Requests", "Created"];
  const rows = bookings.map((b) => {
    if (b._rowType === "package_lead") {
      return [
        "Package Booking",
        b.booking_id,
        b.trip_display_name || "",
        b.guest_name,
        b.phone,
        b.email || "",
        b.adults ?? 2,
        b.children ?? 0,
        "",
        b.checkin || "",
        b.checkout || "",
        getNights(b.checkin, b.checkout),
        "",
        "",
        "",
        b.total_price || 0,
        b.status,
        (b.package_message || "").replace(/\n/g, " "),
        b.created_at ? formatDate(parseISO(b.created_at), "yyyy-MM-dd HH:mm") : "",
      ];
    }
    const stayName = b.stay_id && stays[b.stay_id] ? stays[b.stay_id].name : "";
    const rooms = Array.isArray(b.rooms) ? b.rooms.map((r: any) => `${r.name}×${r.count}`).join("; ") : "";
    const addons = Array.isArray(b.addons) ? b.addons.map((a: any) => a.label).join("; ") : "";
    return [
      "Stay booking",
      b.booking_id,
      stayName,
      b.guest_name,
      b.phone,
      b.email || "",
      b.adults || 1,
      b.children || 0,
      b.pets || 0,
      b.checkin || "",
      b.checkout || "",
      getNights(b.checkin, b.checkout),
      rooms,
      addons,
      b.coupon_code || "",
      b.total_price || 0,
      b.status,
      b.special_requests || "",
      b.created_at ? formatDate(parseISO(b.created_at), "yyyy-MM-dd HH:mm") : "",
    ];
  });
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-${formatDate(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function whatsappUrl(phone: string, guestName: string, bookingId: string, isEnquiry: boolean, stayName?: string, countryCode?: string) {
  const num = formatPhoneForWhatsApp(phone, countryCode);
  const typeLabel = isEnquiry ? "Enquiry" : "Booking";
  const stayLabel = stayName ? ` for ${stayName}` : "";
  const text = encodeURIComponent(`Hi ${guestName}, regarding your ${typeLabel}${stayLabel} (${bookingId}) — `);
  return `https://wa.me/${num}?text=${text}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const { format: formatMoney } = useCurrency();
  const [bookings, setBookings] = useState<any[]>([]);
  const [packageLeadRows, setPackageLeadRows] = useState<any[]>([]);
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
  /** booking.id → quote_id when a quotation was created from that booking */
  const [quotationByBookingId, setQuotationByBookingId] = useState<Record<string, string>>({});
  const [quotationBusyBookingId, setQuotationBusyBookingId] = useState<string | null>(null);
  /** Sync guard: React state updates async; blocks double activation before re-render */
  const quotationInFlightRef = useRef(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [quickDate, setQuickDate] = useState<string | null>(null);
  
  // Reminder Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [intervalHours, setIntervalHours] = useState("24");
  const [savingSettings, setSavingSettings] = useState(false);
  // Map: bookingId / leadId → earliest active reminder scheduled_for
  const [reminderMap, setReminderMap] = useState<Record<string, string>>({});
  
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const { settings: siteSettings } = useSiteSettings();
  const router = useRouter();

  // Use site settings if available to initialize interval
  useEffect(() => {
    if (siteSettings) {
      const s = siteSettings as any;
      if (s.auto_reminders_enabled !== undefined) {
        setAutoEnabled(s.auto_reminders_enabled ?? true);
      }
      if (s.reminder_interval_hours !== undefined) {
        setIntervalHours((s.reminder_interval_hours || 24).toString());
      }
    }
  }, [siteSettings]);

  const saveReminderSettings = async () => {
    setSavingSettings(true);
    const { data: myTenantId } = await supabase.rpc("get_my_tenant_id");
    if (!myTenantId) {
      toast({ title: "Could not identify tenant", variant: "destructive" });
      setSavingSettings(false);
      return;
    }
    const { error } = await (supabase as any).from("site_settings").update({
      auto_reminders_enabled: autoEnabled,
      reminder_interval_hours: parseInt(intervalHours) || 24,
    }).eq("tenant_id", myTenantId);
    
    setSavingSettings(false);
    if (error) {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings Saved", description: "Auto reminder settings have been updated." });
      setSettingsOpen(false);
    }
  };

  // Fetch active reminders whenever bookings change
  useEffect(() => {
    const allIds = bookings.map((b) => b.id).filter(Boolean);
    if (allIds.length === 0) return;

    (supabase as any)
      .from("admin_reminders")
      .select("booking_id, lead_id, scheduled_for")
      .eq("triggered", false)
      .then(({ data }: { data: any[] }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        for (const r of data) {
          const key = r.booking_id || r.lead_id;
          if (!key) continue;
          // Keep the earliest one
          if (!map[key] || r.scheduled_for < map[key]) {
            map[key] = r.scheduled_for;
          }
        }
        setReminderMap(map);
      });
  }, [bookings, packageLeadRows]);

  const fetchBookings = useCallback(async () => {
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) {
      setBookings([]);
      setPackageLeadRows([]);
      setStays({});
      setLoading(false);
      return;
    }

    const [{ data: bk }, { data: st }, { data: pkgLeads }] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name, stay_id").eq("tenant_id", tenantId),
      supabase
        .from("leads")
        .select("*")
        .eq("source", PACKAGE_BOOKING_LEAD_SOURCE)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);
    if (bk) setBookings(bk);
    let quoteMap: Record<string, string> = {};
    if (bk && bk.length > 0) {
      const ids = (bk as { id: string }[]).map((b) => b.id).filter(Boolean);
      const { data: qRows } = await supabase
        .from("quotations")
        .select("booking_id, quote_id")
        .in("booking_id", ids);
      (qRows || []).forEach((q: { booking_id: string | null; quote_id: string }) => {
        if (q.booking_id && q.quote_id) quoteMap[q.booking_id] = q.quote_id;
      });
    }
    setQuotationByBookingId(quoteMap);
    if (st) {
      const map: StayMap = {};
      st.forEach((s: any) => { map[s.id] = { name: s.name, stay_id: s.stay_id }; });
      setStays(map);
    }

    const leadsList = pkgLeads || [];
    const tripIds = [
      ...new Set(
        leadsList
          .map((l: any) =>
            l.meta && typeof l.meta === "object" && !Array.isArray(l.meta)
              ? (l.meta as Record<string, unknown>).trip_id
              : null
          )
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    ];
    let tripNames: Record<string, string> = {};
    if (tripIds.length > 0) {
      const { data: trips } = await supabase.from("trips").select("id, name").in("id", tripIds);
      trips?.forEach((t: any) => {
        tripNames[t.id] = t.name;
      });
    }
    setPackageLeadRows(leadsList.map((l: any) => mapPackageLeadToRow(l, tripNames)));

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

  useEffect(() => {
    const channel = supabase
      .channel("package-leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `source=eq.${PACKAGE_BOOKING_LEAD_SOURCE}` },
        () => fetchBookings()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const combinedRows = useMemo(
    () => [
      ...bookings.map((b) => ({ ...b, _rowType: "stay_booking" as const, _selectionKey: b.id })),
      ...packageLeadRows,
    ],
    [bookings, packageLeadRows]
  );

  // ── Filtered + sorted ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...combinedRows];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.booking_id?.toLowerCase().includes(q) ||
        b.guest_name?.toLowerCase().includes(q) ||
        b.phone?.includes(q) ||
        (b.stay_id && stays[b.stay_id]?.name?.toLowerCase().includes(q)) ||
        (b._rowType === "package_lead" &&
          (String(b.trip_display_name || "").toLowerCase().includes(q) ||
            String(b.package_message || "").toLowerCase().includes(q)))
      );
    }

    if (statusTab === "enquiries") {
      list = list.filter((b) => b.is_enquiry === true);
    } else if (statusTab !== "all") {
      list = list.filter((b) => b.status === statusTab && typeof b.is_enquiry === 'boolean' ? !b.is_enquiry : true);
    }

    if (stayFilter !== "all") list = list.filter((b) => b._rowType === "package_lead" || b.stay_id === stayFilter);

    if (dateFrom) {
      list = list.filter((b) => b.checkin && parseISO(b.checkin) >= startOfDay(dateFrom));
    }
    if (dateTo) {
      list = list.filter((b) => b.checkin && parseISO(b.checkin) <= endOfDay(dateTo));
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
  }, [combinedRows, search, statusTab, stayFilter, sortKey, sortAsc, stays, dateFrom, dateTo]);

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const todayStr = formatDate(new Date(), "yyyy-MM-dd");
    let pending = 0, confirmed = 0, cancelled = 0, revenue = 0, enquiries = 0;
    let arrivingToday = 0, departingToday = 0;

    for (const b of bookings) {
      if (b.is_enquiry) enquiries++;
      else if (b.status === "pending") pending++;
      else if (b.status === "confirmed") { confirmed++; revenue += b.total_price || 0; }
      else if (b.status === "cancelled") cancelled++;
      if (b.checkin === todayStr && b.status !== "cancelled") arrivingToday++;
      if (b.checkout === todayStr && b.status !== "cancelled") departingToday++;
    }

    for (const p of packageLeadRows) {
      if (p.status === "pending") pending++;
      else if (p.status === "confirmed") { confirmed++; revenue += p.total_price || 0; }
      else if (p.status === "cancelled") cancelled++;
      if (p.checkin === todayStr && p.status !== "cancelled") arrivingToday++;
      if (p.checkout === todayStr && p.status !== "cancelled") departingToday++;
    }

    return {
      total: bookings.length + packageLeadRows.length,
      enquiries,
      pending,
      confirmed,
      cancelled,
      revenue,
      arrivingToday,
      departingToday,
      packageCount: packageLeadRows.length,
    };
  }, [bookings, packageLeadRows]);

  // ── Unique stays for filter ───────────────────────────────────────────

  const stayOptions = useMemo(() => {
    const ids = new Set(bookings.map(b => b.stay_id).filter(Boolean));
    return Array.from(ids).map(id => ({ id, name: stays[id]?.name || id })).sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings, stays]);

  // ── Selection ─────────────────────────────────────────────────────────

  const selectableFiltered = useMemo(
    () => filtered.filter((b) => b._rowType !== "package_lead"),
    [filtered]
  );
  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((b) => selectedIds.has(b._selectionKey));
  const toggleSelectAll = () => {
    setSelectedIds(
      allFilteredSelected
        ? new Set()
        : new Set(selectableFiltered.map((b) => b._selectionKey))
    );
  };
  const toggleSelect = (selectionKey: string, isPackage: boolean) => {
    if (isPackage) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(selectionKey) ? next.delete(selectionKey) : next.add(selectionKey);
      return next;
    });
  };

  // ── Handlers ──────────────────────────────────────────────────────────

  const updateStatus = async (row: any, status: string) => {
    if (row._rowType === "package_lead") {
      const leadStatus = bookingTabToLeadStatus(status as "pending" | "confirmed" | "cancelled");
      const { error } = await supabase.from("leads").update({ status: leadStatus }).eq("id", row._leadId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: `Enquiry marked as ${status}` });
      fetchBookings();
      if (selected?._selectionKey === row._selectionKey) {
        setSelected({ ...row, status, _leadStatus: leadStatus });
      }
      return;
    }

    const id = row.id;
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
    const ids = Array.from(selectedIds).filter((k) => !String(k).startsWith("pkg:"));
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
    if (!booking?.id) return;
    if (quotationInFlightRef.current) return;
    const existingId = quotationByBookingId[booking.id];
    if (existingId) {
      toast({
        title: "Quotation already exists",
        description: `${existingId} for this booking`,
        variant: "destructive",
      });
      return;
    }
    if (quotationBusyBookingId) return;

    quotationInFlightRef.current = true;
    setQuotationBusyBookingId(booking.id);
    try {
      const { data: existingRow } = await supabase
        .from("quotations")
        .select("quote_id")
        .eq("booking_id", booking.id)
        .maybeSingle();
      if (existingRow?.quote_id) {
        setQuotationByBookingId((m) => ({ ...m, [booking.id]: existingRow.quote_id }));
        toast({
          title: "Quotation already exists",
          description: `${existingRow.quote_id} for this booking`,
          variant: "destructive",
        });
        return;
      }

      const quoteId = `Q-${Date.now().toString(36).toUpperCase()}`;
      const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];
      const addons = Array.isArray(booking.addons) ? booking.addons : [];
      const roomTotal = rooms.reduce((s: number, r: any) => s + (r.price || 0) * (r.count || 1), 0);
      const addonsTotal = addons.reduce((s: number, a: any) => s + (a.price || 0), 0);

      const { error } = await supabase.from("quotations").insert({
        quote_id: quoteId,
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
        special_requests: booking.special_requests,
        status: "draft",
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Quotation already exists",
            description: "This booking already has a quotation.",
            variant: "destructive",
          });
          const { data: again } = await supabase
            .from("quotations")
            .select("quote_id")
            .eq("booking_id", booking.id)
            .maybeSingle();
          if (again?.quote_id) {
            setQuotationByBookingId((m) => ({ ...m, [booking.id]: again.quote_id }));
          }
        } else {
          toast({ title: "Error creating quotation", description: error.message, variant: "destructive" });
        }
        return;
      }

      setQuotationByBookingId((m) => ({ ...m, [booking.id]: quoteId }));
      toast({ title: "Quotation created", description: `${quoteId} for ${booking.guest_name}` });
    } finally {
      quotationInFlightRef.current = false;
      setQuotationBusyBookingId(null);
    }
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

    let invoiceTenantId: string | null = booking.tenant_id ?? null;
    if (!invoiceTenantId) {
      const { data: rpcTid } = await supabase.rpc("get_my_tenant_id");
      invoiceTenantId = rpcTid ?? null;
    }
    if (!invoiceTenantId && booking.stay_id) {
      const { data: stayRow } = await supabase.from("stays").select("tenant_id").eq("id", booking.stay_id).maybeSingle();
      invoiceTenantId = stayRow?.tenant_id ?? null;
    }
    if (!invoiceTenantId) {
      toast({
        title: "Error creating invoice",
        description: "Could not resolve tenant for this booking.",
        variant: "destructive",
      });
      return null;
    }

    const { error } = await supabase.from("invoices").insert({
      invoice_id: invoiceId,
      booking_id: booking.id,
      guest_name: booking.guest_name,
      phone: booking.phone,
      email: booking.email,
      stay_id: booking.stay_id,
      tenant_id: invoiceTenantId,
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

  const handleQuickDate = (type: "today" | "tomorrow" | "upcoming") => {
    if (quickDate === type) {
      setQuickDate(null);
      setDateFrom(undefined);
      setDateTo(undefined);
      return;
    }
    setQuickDate(type);
    const today = new Date();
    if (type === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (type === "tomorrow") {
      const tomorrow = addDays(today, 1);
      setDateFrom(tomorrow);
      setDateTo(tomorrow);
    } else if (type === "upcoming") {
      setDateFrom(addDays(today, 1));
      setDateTo(undefined);
    }
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
    setQuickDate(null);
  };

  const hasActiveFilters = search || statusTab !== "all" || stayFilter !== "all" || dateFrom || dateTo || !!quickDate;

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
            {stats.packageCount > 0 && (
              <span className="text-violet-600 dark:text-violet-400 ml-1">
                · {stats.packageCount} package {stats.packageCount === 1 ? "enquiry" : "enquiries"}
              </span>
            )}
            {stats.arrivingToday > 0 && <span className="text-blue-500 ml-1">· {stats.arrivingToday} arriving today</span>}
            {stats.departingToday > 0 && <span className="text-orange-500 ml-1">· {stats.departingToday} departing</span>}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {isSupported && !isSubscribed && (
            <Button variant="outline" size="sm" className="h-8 text-xs bg-muted/50" onClick={subscribe}>
              <Bell className="w-3.5 h-3.5 mr-1" /> Notifications
            </Button>
          )}

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs bg-muted/50" title="Reminder Settings">
                <Settings className="w-3.5 h-3.5 mr-1" /> Auto Reminders
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Auto Reminder Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Auto Reminders</Label>
                      <p className="text-[13px] text-muted-foreground">Automatically send reminders for confirmed bookings.</p>
                    </div>
                    <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
                  </div>
                  
                  {autoEnabled && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Reminder Interval</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={intervalHours}
                          onChange={(e) => setIntervalHours(e.target.value)}
                          className="w-20"
                          min="1"
                        />
                        <span className="text-sm text-muted-foreground">hours before check-in</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground pt-1">
                        An automatic notification will be sent this many hours ahead.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveReminderSettings} disabled={savingSettings}>
                  {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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
          { label: "Revenue", value: loading ? "…" : formatMoney(stats.revenue), icon: IndianRupee, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
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
            <TabsTrigger value="enquiries" className="text-[11px] sm:text-xs px-2.5">Enquiries ({stats.enquiries})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ID, guest, phone, stay, package..."
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

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" className={cn("h-9 text-xs", quickDate === "today" && "bg-muted")} onClick={() => handleQuickDate("today")}>Today</Button>
            <Button variant="outline" size="sm" className={cn("h-9 text-xs", quickDate === "tomorrow" && "bg-muted")} onClick={() => handleQuickDate("tomorrow")}>Tomorrow</Button>
            <Button variant="outline" size="sm" className={cn("h-9 text-xs", quickDate === "upcoming" && "bg-muted")} onClick={() => handleQuickDate("upcoming")}>Upcoming</Button>
          </div>

          <DateRangePicker from={dateFrom} to={dateTo} onFromChange={(val) => { setDateFrom(val); setQuickDate(null); }} onToChange={(val) => { setDateTo(val); setQuickDate(null); }} />

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
            checked={allFilteredSelected && selectableFiltered.length > 0}
            disabled={selectableFiltered.length === 0}
            onCheckedChange={() => toggleSelectAll()}
          />
          <span className="text-xs text-muted-foreground">
            {selectableFiltered.length === 0
              ? "Package enquiries only (bulk actions apply to stay bookings)"
              : allFilteredSelected
                ? "Deselect all"
                : `Select all ${selectableFiltered.length} stay booking${selectableFiltered.length !== 1 ? "s" : ""}`}
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
          const isPackage = b._rowType === "package_lead";
          const stayInfo = b.stay_id ? stays[b.stay_id] : null;
          const nights = getNights(b.checkin, b.checkout);
          const stayBadge = b.checkin && b.checkout ? getStayLabel(b.checkin, b.checkout) : null;
          const reminderAt = reminderMap[b.id] || reminderMap[b._leadId];
          const reminderLabel = reminderAt ? (() => {
            const ms = new Date(reminderAt).getTime() - Date.now();
            if (ms < 0) return "Due";
            const h = Math.round(ms / 1000 / 60 / 60);
            return h < 24 ? `In ${h}h` : `In ${Math.round(h / 24)}d`;
          })() : null;

          return (
            <motion.div
              key={b._selectionKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                "rounded-xl border bg-card hover:shadow-md transition-shadow",
                selectedIds.has(b._selectionKey) && "ring-2 ring-primary",
                isPackage && "border-violet-200/80 dark:border-violet-900/50",
                b.is_enquiry && "bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/50"
              )}
            >
              {/* Header: guest + price + checkbox */}
              <div className="p-3 pb-2 flex items-start gap-2 cursor-pointer" onClick={() => setSelected(b)}>
                <div className="mt-0.5 shrink-0 w-5 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  {isPackage ? (
                    <span className="inline-flex" title="Package enquiry">
                      <Luggage className="w-4 h-4 text-violet-600 shrink-0" />
                    </span>
                  ) : (
                    <Checkbox
                      checked={selectedIds.has(b._selectionKey)}
                      onCheckedChange={() => toggleSelect(b._selectionKey, false)}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{b.guest_name}</p>
                    <span className="font-bold text-sm text-primary shrink-0 tabular-nums">{formatMoney(b.total_price || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-mono">{b.booking_id}</span>
                    {reminderLabel && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full px-1.5 py-0 leading-5">
                        🔔 {reminderLabel}
                      </span>
                    )}
                    {b.is_enquiry && (
                      <Badge variant="secondary" className="text-[8px] py-0 px-1.5 bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-500">
                        Enquiry
                      </Badge>
                    )}
                    {isPackage && (
                      <Badge variant="secondary" className="text-[8px] py-0 px-1.5 bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800">
                        Package Booking
                      </Badge>
                    )}
                    {stayInfo && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground truncate">{stayInfo.name}</span>
                      </>
                    )}
                  </div>
                  {isPackage && b.trip_display_name && (
                    <p className="text-[10px] font-medium text-violet-700 dark:text-violet-300 mt-0.5 truncate">{b.trip_display_name}</p>
                  )}
                  {b.phone && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{b.phone}</p>
                  )}
                </div>
              </div>

              {/* Dates + badges */}
              <div className="px-3 pb-2 cursor-pointer" onClick={() => setSelected(b)}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium">
                    {b.checkin ? formatDate(parseISO(b.checkin), "dd MMM yy") : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs font-medium">
                    {b.checkout ? formatDate(parseISO(b.checkout), "dd MMM yy") : "—"}
                  </span>
                  {nights > 0 && <span className="text-[10px] text-muted-foreground">({nights}N)</span>}
                  {stayBadge && b.status !== "cancelled" && (
                    <Badge variant="outline" className={cn("text-[8px] py-0 px-1 ml-auto", stayBadge.className)}>{stayBadge.label}</Badge>
                  )}
                </div>
                {/* Traveller & tag badges */}
                {(isPackage || b.coupon_code || b.solo_traveller || b.group_booking) && (
                  <div className="flex items-center gap-1 flex-wrap mt-1.5">
                    {b.coupon_code && <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30">🏷 {b.coupon_code}</Badge>}
                    {b.solo_traveller && <Badge variant="outline" className="text-[8px] py-0 px-1.5">Solo</Badge>}
                    {b.group_booking && <Badge variant="outline" className="text-[8px] py-0 px-1.5">Group{b.group_name ? `: ${b.group_name}` : ""}</Badge>}
                    {isPackage && (
                      <Badge variant="outline" className="text-[8px] py-0 px-1.5 ml-auto">
                        {b.adults ?? 2}A{b.children > 0 ? ` ${b.children}C` : ""}
                      </Badge>
                    )}
                    {!isPackage && !b.solo_traveller && (b.adults || b.children > 0 || b.pets > 0) && (
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
                        onClick={() => { if (!isActive) updateStatus(b, st); }}
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
                    href={whatsappUrl(b.phone, b.guest_name, b.booking_id, !!b.is_enquiry, stayInfo?.name || b.trip_display_name, b.phone_country_code)}
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
                      {!isPackage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!!quotationByBookingId[b.id] || quotationBusyBookingId === b.id}
                            onSelect={(e) => {
                              if (quotationByBookingId[b.id] || quotationBusyBookingId || quotationInFlightRef.current) {
                                e.preventDefault();
                                return;
                              }
                              void createQuotation(b);
                            }}
                          >
                            <FileText className="w-3.5 h-3.5 mr-2" /> Quotation
                          </DropdownMenuItem>
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
                        </>
                      )}
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
          Showing {filtered.length} of {combinedRows.length} item{combinedRows.length !== 1 ? "s" : ""}
          {filtered.length > 0 && ` · ${formatMoney(filtered.reduce((s, b) => s + (b.total_price || 0), 0))} total`}
          {stats.packageCount > 0 && ` · includes ${stats.packageCount} package`}
        </p>
      )}

      {/* Detail Dialog */}
      <BookingDetailDialog
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        booking={selected}
        stayInfo={selected?.stay_id ? stays[selected.stay_id] : null}
        packageLead={selected?._rowType === "package_lead"}
        tripDisplayName={selected?._rowType === "package_lead" ? selected.trip_display_name : undefined}
        onStatusChange={(status) => { if (selected) updateStatus(selected, status); }}
        quotationLoading={!!selected && quotationBusyBookingId === selected.id}
        existingQuotationId={selected?.id ? quotationByBookingId[selected.id] ?? null : null}
        onCreateQuotation={selected?._rowType === "package_lead" ? undefined : () => { if (selected) createQuotation(selected); }}
        onCreateInvoice={selected?._rowType === "package_lead" ? undefined : async () => {
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
        onReminderSet={(bookingId, scheduledFor) => {
          setReminderMap(prev => ({ ...prev, [bookingId]: scheduledFor }));
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
    ? `${formatDate(from, "dd MMM")} – ${formatDate(to, "dd MMM")}`
    : from
      ? `From ${formatDate(from, "dd MMM")}`
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
