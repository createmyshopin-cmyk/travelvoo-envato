import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Copy, Calendar as CalendarIcon, Pencil,
  RefreshCw, IndianRupee, Ban, TrendingUp, CalendarDays, RotateCcw,
  Sunrise, Moon, Sparkles, Timer, Shield, CalendarCheck,
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isToday, isBefore, startOfDay, addWeeks, subWeeks, addDays, subDays, getDay,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stay { id: string; name: string; }
interface RoomCategory { id: string; name: string; price: number; available: number; }
interface PricingEntry {
  id: string; date: string; price: number; original_price: number;
  available: number; min_nights: number; is_blocked: boolean;
  cooldown_minutes: number | null;
  room_category_id: string | null; stay_id: string;
}
type ViewMode = "month" | "week";

// ─── Special Days ─────────────────────────────────────────────────────────────

const SPECIAL_DAYS: Record<string, { emoji: string; label: string; type: "indian" | "international" }> = {
  "01-26": { emoji: "🇮🇳", label: "Republic Day", type: "indian" },
  "03-14": { emoji: "🎨", label: "Holi", type: "indian" },
  "08-15": { emoji: "🇮🇳", label: "Independence Day", type: "indian" },
  "10-02": { emoji: "🕊️", label: "Gandhi Jayanti", type: "indian" },
  "10-12": { emoji: "🪔", label: "Dussehra", type: "indian" },
  "10-31": { emoji: "🪔", label: "Diwali", type: "indian" },
  "11-01": { emoji: "🪔", label: "Diwali Day 2", type: "indian" },
  "11-15": { emoji: "👶", label: "Children's Day", type: "indian" },
  "04-14": { emoji: "🌾", label: "Baisakhi", type: "indian" },
  "01-14": { emoji: "🪁", label: "Makar Sankranti", type: "indian" },
  "08-26": { emoji: "🎉", label: "Janmashtami", type: "indian" },
  "09-05": { emoji: "📚", label: "Teachers' Day", type: "indian" },
  "01-01": { emoji: "🎆", label: "New Year", type: "international" },
  "02-14": { emoji: "❤️", label: "Valentine's Day", type: "international" },
  "03-08": { emoji: "💜", label: "Women's Day", type: "international" },
  "05-01": { emoji: "✊", label: "Labour Day", type: "international" },
  "06-21": { emoji: "🧘", label: "Intl Yoga Day", type: "international" },
  "12-25": { emoji: "🎄", label: "Christmas", type: "international" },
  "12-31": { emoji: "🎊", label: "New Year's Eve", type: "international" },
  "10-30": { emoji: "🎃", label: "Halloween Eve", type: "international" },
  "06-15": { emoji: "👨", label: "Father's Day", type: "international" },
  "05-11": { emoji: "👩", label: "Mother's Day", type: "international" },
};

const getSpecialDay = (date: Date) => SPECIAL_DAYS[format(date, "MM-dd")] || null;

/** Same multipliers as BookingCalendar.tsx — Mon-Thu ×1.0, Fri ×1.15, Sat-Sun ×1.3 */
const getDefaultPrice = (date: Date, basePrice: number): number => {
  const dow = getDay(date); // 0=Sun,1=Mon,...,6=Sat
  if (dow === 6 || dow === 0) return Math.round(basePrice * 1.3);
  if (dow === 5) return Math.round(basePrice * 1.15);
  return basePrice;
};

const validatePrice = (raw: string): number | null => {
  const val = parseInt(raw, 10);
  return isNaN(val) || val < 100 || val > 100000 ? null : val;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCalendar() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);
  const [rooms, setRooms] = useState<RoomCategory[]>([]);
  const [selectedStay, setSelectedStay] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [pricing, setPricing] = useState<PricingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  // Selection & editing
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkAvailability, setBulkAvailability] = useState("");
  const [bulkMinNights, setBulkMinNights] = useState("1");
  const [bulkBlocked, setBulkBlocked] = useState(false);

  // Weekend pricing
  const [weekendDialogOpen, setWeekendDialogOpen] = useState(false);
  const [weekdayPrice, setWeekdayPrice] = useState("");
  const [weekendPrice, setWeekendPrice] = useState("");

  // Seasonal pricing
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [seasonPrice, setSeasonPrice] = useState("");

  // Copy pricing
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState("");

  // Cooldown (minutes)
  const [cooldownDialogOpen, setCooldownDialogOpen] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState(1440);
  const [savingCooldown, setSavingCooldown] = useState(false);
  const [bulkCooldownMinutes, setBulkCooldownMinutes] = useState("");

  // Google Calendar sync
  const [gcalEnabled, setGcalEnabled] = useState(false);
  const [gcalWebhookUrl, setGcalWebhookUrl] = useState("");
  const [gcalSyncing, setGcalSyncing] = useState(false);

  // Today reference (start of day, stable)
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  // Drag selection (desktop)
  const isDragging = useRef(false);
  const dragStart = useRef<string | null>(null);

  // Fetch stays + tenant id + gcal settings on mount (tenant-scoped: only own stays)
  useEffect(() => {
    const init = async () => {
      const { data: tid } = await supabase.rpc("get_my_tenant_id");
      setTenantId(tid ?? null);
      let staysQuery = supabase.from("stays").select("id, name");
      if (tid != null) staysQuery = staysQuery.eq("tenant_id", tid);
      const { data } = await staysQuery;
      if (data?.length) { setStays(data); if (!selectedStay) setSelectedStay(data[0].id); }
    };
    init();
    supabase.from("site_settings").select("gcal_enabled, gcal_webhook_url").limit(1).single().then(({ data }) => {
      if (data) {
        setGcalEnabled((data as any).gcal_enabled ?? false);
        setGcalWebhookUrl((data as any).gcal_webhook_url ?? "");
      }
    });
  }, []);

  // Fetch rooms + cooldown
  useEffect(() => {
    if (!selectedStay) return;
    supabase.from("room_categories").select("id, name, price, available").eq("stay_id", selectedStay).then(({ data }) => setRooms(data || []));
    supabase.from("stays").select("cooldown_minutes").eq("id", selectedStay).single().then(({ data }) => {
      setCooldownMinutes(data?.cooldown_minutes ?? 1440);
    });
  }, [selectedStay]);

  const formatCooldown = (mins: number): string => {
    if (mins === 0) return "None";
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return h >= 24 ? `${h / 24}d` : `${h}h`;
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
  };

  const saveCooldown = async () => {
    if (!selectedStay) return;
    setSavingCooldown(true);
    await supabase.from("stays").update({ cooldown_minutes: cooldownMinutes } as any).eq("id", selectedStay);
    toast({ title: "Cool time updated", description: `Global: ${formatCooldown(cooldownMinutes)} between bookings.` });
    setSavingCooldown(false);
    setCooldownDialogOpen(false);
  };

  // Google Calendar sync
  const syncToGoogleCalendar = useCallback(async () => {
    if (!selectedStay || !gcalWebhookUrl) return;
    setGcalSyncing(true);
    try {
      const stayName = stays.find(s => s.id === selectedStay)?.name || "Stay";
      const { data: allEntries } = await supabase
        .from("calendar_pricing")
        .select("date, price, original_price, is_blocked, available, min_nights")
        .eq("stay_id", selectedStay);

      await fetch(gcalWebhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stay_id: selectedStay,
          stay_name: stayName,
          entries: allEntries || [],
        }),
      });
      toast({ title: "Sync sent to Google Calendar", description: `${allEntries?.length || 0} dates queued for sync.` });
    } catch {
      toast({ title: "Sync failed", description: "Could not reach the Apps Script webhook.", variant: "destructive" });
    }
    setGcalSyncing(false);
  }, [selectedStay, gcalWebhookUrl, stays]);

  // Date range
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      const ms = startOfMonth(currentDate);
      return { start: startOfWeek(ms, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) };
    }
    return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
  }, [currentDate, viewMode]);

  // Fetch pricing + bookings
  const fetchPricing = useCallback(async () => {
    if (!selectedStay) return;
    setLoading(true);
    const startStr = format(dateRange.start, "yyyy-MM-dd");
    const endStr = format(dateRange.end, "yyyy-MM-dd");

    let query = supabase.from("calendar_pricing").select("*").eq("stay_id", selectedStay).gte("date", startStr).lte("date", endStr);
    if (selectedRoom !== "all") query = query.eq("room_category_id", selectedRoom);
    const { data } = await query;
    setPricing(data || []);

    const { data: bk } = await supabase.from("bookings").select("checkin, checkout, status, guest_name")
      .eq("stay_id", selectedStay).gte("checkout", startStr).lte("checkin", endStr).neq("status", "cancelled");
    setBookings(bk || []);
    setLoading(false);
  }, [selectedStay, selectedRoom, dateRange]);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  // Realtime: re-fetch when calendar_pricing or bookings change for this stay
  useEffect(() => {
    if (!selectedStay) return;
    const channel = supabase
      .channel(`admin-calendar-${selectedStay}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_pricing", filter: `stay_id=eq.${selectedStay}` }, () => fetchPricing())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `stay_id=eq.${selectedStay}` }, () => fetchPricing())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedStay, fetchPricing]);

  const getPricingForDate = (dateStr: string) => pricing.find(p => p.date === dateStr);
  const getBookingForDate = (dateStr: string) => bookings.find(b => b.checkin <= dateStr && b.checkout > dateStr);

  const cooldownDates = useMemo(() => {
    const dates = new Set<string>();
    for (const b of bookings) {
      if (!b.checkout) continue;
      const checkoutDate = new Date(b.checkout);
      const checkoutStr = format(checkoutDate, "yyyy-MM-dd");
      const perDateEntry = pricing.find(p => p.date === checkoutStr);
      const effectiveMins = perDateEntry?.cooldown_minutes ?? cooldownMinutes;
      const coolDays = Math.ceil(effectiveMins / 1440);
      for (let i = 0; i < coolDays; i++) {
        const d = addDays(checkoutDate, i);
        const ds = format(d, "yyyy-MM-dd");
        if (!bookings.some(bk => bk.checkin <= ds && bk.checkout > ds)) {
          dates.add(ds);
        }
      }
    }
    return dates;
  }, [bookings, cooldownMinutes, pricing]);

  const isCooldownDate = (dateStr: string) => cooldownDates.has(dateStr);

  const getPriceLevel = (price: number): "low" | "medium" | "high" => {
    const basePrice = (rooms.find(r => selectedRoom === "all" ? true : r.id === selectedRoom)?.price) || 3000;
    if (price <= basePrice * 0.85) return "low";
    if (price >= basePrice * 1.3) return "high";
    return "medium";
  };

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    let pricedDays = 0, blockedDays = 0, bookedDays = 0, totalPrice = 0;

    const basePrice = rooms.length > 0 ? (selectedRoom !== "all" ? rooms.find(r => r.id === selectedRoom)?.price : rooms[0]?.price) ?? 0 : 0;
    for (const day of monthDays) {
      const ds = format(day, "yyyy-MM-dd");
      const entry = getPricingForDate(ds);
      const booking = getBookingForDate(ds);
      const effectivePrice = entry ? entry.price : (basePrice ? getDefaultPrice(day, basePrice) : 0);
      if (effectivePrice && !entry?.is_blocked) { pricedDays++; totalPrice += effectivePrice; }
      if (entry?.is_blocked) blockedDays++;
      if (booking) bookedDays++;
    }

    const avgPrice = pricedDays > 0 ? Math.round(totalPrice / pricedDays) : 0;
    const occupancy = monthDays.length > 0 ? Math.round((bookedDays / monthDays.length) * 100) : 0;

    return { pricedDays, blockedDays, bookedDays, avgPrice, occupancy, totalDays: monthDays.length };
  }, [currentDate, pricing, bookings]);

  // ── Navigation ────────────────────────────────────────────────────────

  const nav = (dir: number) => {
    setSelectedDates(new Set());
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };
  const goToday = () => { setCurrentDate(new Date()); setSelectedDates(new Set()); };

  // ── Date Selection ────────────────────────────────────────────────────

  const handleDateMouseDown = (dateStr: string) => {
    isDragging.current = true;
    dragStart.current = dateStr;
    setSelectedDates(new Set([dateStr]));
  };

  const handleDateMouseEnter = (dateStr: string) => {
    if (!isDragging.current || !dragStart.current) return;
    const start = new Date(dragStart.current);
    const end = new Date(dateStr);
    const [from, to] = start <= end ? [start, end] : [end, start];
    setSelectedDates(new Set(eachDayOfInterval({ start: from, end: to }).map(d => format(d, "yyyy-MM-dd"))));
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    dragStart.current = null;
    if (selectedDates.size > 0) setBulkDialogOpen(true);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [selectedDates]);

  // Mobile: tap to select, tap again to open editor
  const handleDateTap = (dateStr: string) => {
    if (selectedDates.has(dateStr) && selectedDates.size === 1) {
      setBulkDialogOpen(true);
    } else {
      setSelectedDates(new Set([dateStr]));
      setBulkDialogOpen(true);
    }
  };

  // ── Bulk Save ─────────────────────────────────────────────────────────

  const saveBulkPricing = async () => {
    if (!selectedStay) return;
    if (bulkPrice && validatePrice(bulkPrice) === null) {
      toast({ title: "Invalid price", description: "Price must be ₹100 – ₹1,00,000", variant: "destructive" });
      return;
    }

    const dates = Array.from(selectedDates);
    const roomId = selectedRoom === "all" ? null : selectedRoom;

    for (const dateStr of dates) {
      const existing = getPricingForDate(dateStr);
      const updates: any = { stay_id: selectedStay, date: dateStr, room_category_id: roomId };
      if (bulkPrice) updates.price = parseInt(bulkPrice, 10);
      if (bulkAvailability) updates.available = parseInt(bulkAvailability, 10);
      if (bulkMinNights) updates.min_nights = parseInt(bulkMinNights, 10);
      updates.is_blocked = bulkBlocked;
      updates.cooldown_minutes = bulkCooldownMinutes !== "" ? parseInt(bulkCooldownMinutes, 10) : null;

      if (existing) await supabase.from("calendar_pricing").update(updates).eq("id", existing.id);
      else { updates.original_price = updates.price || 0; if (tenantId) updates.tenant_id = tenantId; await supabase.from("calendar_pricing").insert(updates); }
    }

    toast({ title: "Pricing updated", description: `Updated ${dates.length} date${dates.length > 1 ? "s" : ""}.` });
    closeBulkDialog();
    fetchPricing();
  };

  const resetPricing = async () => {
    if (!selectedStay || selectedDates.size === 0) return;
    const dates = Array.from(selectedDates);
    for (const dateStr of dates) {
      const existing = getPricingForDate(dateStr);
      if (existing) await supabase.from("calendar_pricing").delete().eq("id", existing.id);
    }
    toast({ title: "Pricing reset", description: `Cleared ${dates.length} date${dates.length > 1 ? "s" : ""}.` });
    closeBulkDialog();
    fetchPricing();
  };

  const closeBulkDialog = () => {
    setBulkDialogOpen(false);
    setSelectedDates(new Set());
    setBulkPrice(""); setBulkAvailability(""); setBulkMinNights("1"); setBulkBlocked(false); setBulkCooldownMinutes("");
  };

  // ── Weekend Pricing ───────────────────────────────────────────────────

  const saveWeekendPricing = async () => {
    if (!selectedStay) return;
    const vwd = weekdayPrice ? validatePrice(weekdayPrice) : null;
    const vwe = weekendPrice ? validatePrice(weekendPrice) : null;
    if (weekdayPrice && !vwd) { toast({ title: "Invalid weekday price", variant: "destructive" }); return; }
    if (weekendPrice && !vwe) { toast({ title: "Invalid weekend price", variant: "destructive" }); return; }

    const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    const roomId = selectedRoom === "all" ? null : selectedRoom;

    for (const day of days) {
      const dow = getDay(day);
      const isWE = dow === 5 || dow === 6 || dow === 0;
      const price = isWE ? vwe : vwd;
      if (!price) continue;
      const dateStr = format(day, "yyyy-MM-dd");
      const existing = getPricingForDate(dateStr);
      const payload: any = { stay_id: selectedStay, date: dateStr, price, room_category_id: roomId };
      if (existing) await supabase.from("calendar_pricing").update(payload).eq("id", existing.id);
      else { payload.original_price = price; if (tenantId) payload.tenant_id = tenantId; await supabase.from("calendar_pricing").insert(payload); }
    }

    toast({ title: "Weekend pricing applied" });
    setWeekendDialogOpen(false);
    fetchPricing();
  };

  // ── Seasonal Pricing ──────────────────────────────────────────────────

  const saveSeasonalPricing = async () => {
    if (!selectedStay || !seasonStart || !seasonEnd || !seasonPrice) return;
    const vp = validatePrice(seasonPrice);
    if (!vp) { toast({ title: "Invalid price", variant: "destructive" }); return; }

    const days = eachDayOfInterval({ start: new Date(seasonStart), end: new Date(seasonEnd) });
    const roomId = selectedRoom === "all" ? null : selectedRoom;

    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      const existing = getPricingForDate(dateStr);
      const payload: any = { stay_id: selectedStay, date: dateStr, price: vp, room_category_id: roomId };
      if (existing) await supabase.from("calendar_pricing").update(payload).eq("id", existing.id);
      else { payload.original_price = vp; if (tenantId) payload.tenant_id = tenantId; await supabase.from("calendar_pricing").insert(payload); }
    }

    toast({ title: "Seasonal pricing applied", description: `${seasonName || "Season"}: ${days.length} dates updated.` });
    setSeasonDialogOpen(false);
    setSeasonName(""); setSeasonStart(""); setSeasonEnd(""); setSeasonPrice("");
    fetchPricing();
  };

  // ── Copy Pricing ──────────────────────────────────────────────────────

  const saveCopyPricing = async () => {
    if (!copySourceDate || selectedDates.size === 0) return;
    const source = getPricingForDate(copySourceDate);
    if (!source) { toast({ title: "No pricing for source date", variant: "destructive" }); return; }

    for (const dateStr of Array.from(selectedDates)) {
      const existing = getPricingForDate(dateStr);
      const payload: any = {
        stay_id: source.stay_id, date: dateStr, price: source.price,
        original_price: source.original_price, available: source.available,
        min_nights: source.min_nights, is_blocked: source.is_blocked,
        room_category_id: source.room_category_id,
      };
      if (tenantId) payload.tenant_id = tenantId;
      if (existing) await supabase.from("calendar_pricing").update(payload).eq("id", existing.id);
      else await supabase.from("calendar_pricing").insert(payload);
    }

    toast({ title: "Pricing copied" });
    setCopyDialogOpen(false); setCopySourceDate(""); setSelectedDates(new Set());
    fetchPricing();
  };

  // Calendar days
  const calendarDays = useMemo(() => eachDayOfInterval({ start: dateRange.start, end: dateRange.end }), [dateRange]);
  const dayHeadersFull = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayHeadersMobile = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Pricing Calendar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {stays.find(s => s.id === selectedStay)?.name || "Select a stay"} · {format(currentDate, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setCooldownDialogOpen(true)}>
            <Timer className="mr-1 h-3 w-3" /> Cool Time
            <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0">{formatCooldown(cooldownMinutes)}</Badge>
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setWeekendDialogOpen(true)}>
            <Moon className="mr-1 h-3 w-3" /> Weekend
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSeasonDialogOpen(true)}>
            <Sunrise className="mr-1 h-3 w-3" /> Season
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => {
            if (selectedDates.size > 0) setCopyDialogOpen(true);
            else toast({ title: "Select dates first" });
          }}>
            <Copy className="mr-1 h-3 w-3" /> Copy
          </Button>
          {gcalEnabled && gcalWebhookUrl && (
            <Button variant="outline" size="sm" className="text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={syncToGoogleCalendar} disabled={gcalSyncing}>
              <CalendarCheck className="mr-1 h-3 w-3" /> {gcalSyncing ? "Syncing…" : "Google Cal"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Avg Price", value: stats.avgPrice > 0 ? `₹${stats.avgPrice.toLocaleString("en-IN")}` : "—", icon: IndianRupee, color: "text-primary", bg: "bg-primary/5" },
          { label: "Occupancy", value: `${stats.occupancy}%`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Booked Days", value: `${stats.bookedDays}/${stats.totalDays}`, icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Blocked", value: stats.blockedDays, icon: Ban, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
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

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2 flex-1 min-w-0">
          <Select value={selectedStay} onValueChange={setSelectedStay}>
            <SelectTrigger className="flex-1 min-w-0 h-9 text-xs sm:text-sm"><SelectValue placeholder="Select Stay" /></SelectTrigger>
            <SelectContent>{stays.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="flex-1 min-w-0 h-9 text-xs sm:text-sm"><SelectValue placeholder="All Rooms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs px-2.5">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchPricing()} title="Refresh">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm sm:text-lg font-semibold">
          {viewMode === "month" ? format(currentDate, "MMMM yyyy") : `${format(dateRange.start, "MMM d")} – ${format(dateRange.end, "MMM d, yyyy")}`}
        </h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Occupancy Bar */}
      {viewMode === "month" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Occupancy: {stats.occupancy}%</span>
            <span>{stats.bookedDays} of {stats.totalDays} days booked</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", stats.occupancy >= 80 ? "bg-green-500" : stats.occupancy >= 40 ? "bg-yellow-500" : "bg-blue-500")}
              initial={{ width: 0 }}
              animate={{ width: `${stats.occupancy}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      <div className="relative">
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg"
            >
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar Grid */}
        <div className="select-none">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
            {dayHeadersFull.map((d, i) => (
              <div key={d} className="bg-muted px-1 py-1.5 sm:px-2 sm:py-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{dayHeadersMobile[i]}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
            {calendarDays.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const entry = getPricingForDate(dateStr);
              const booking = getBookingForDate(dateStr);
              const isSelected = selectedDates.has(dateStr);
              const inMonth = isSameMonth(day, currentDate);
              const priceLevel = entry ? getPriceLevel(entry.price) : null;
              const specialDay = getSpecialDay(day);
              const isWE = [0, 6].includes(getDay(day)); // Sat+Sun — matches BookingCalendar
              const isCooldown = isCooldownDate(dateStr);
              const isPast = isBefore(day, todayStart);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "bg-background p-1 sm:p-1.5 cursor-pointer transition-colors relative group",
                    "min-h-[52px] sm:min-h-[80px]",
                    !inMonth && "opacity-30",
                    // Past dates — faded, no colour
                    isPast && inMonth && "opacity-25 bg-muted/40 pointer-events-none",
                    // Today — distinct highlight
                    isCurrentDay && "bg-primary/10 ring-2 ring-primary/60 ring-inset",
                    isSelected && !isPast && "ring-2 ring-primary ring-inset bg-primary/5",
                    entry?.is_blocked && !isPast && "bg-destructive/5",
                    isCooldown && !booking && !entry?.is_blocked && !isPast && "bg-amber-50 dark:bg-amber-950/20",
                    booking && !entry?.is_blocked && !isPast && "bg-accent/30",
                    isWE && !isSelected && !booking && !entry?.is_blocked && !isCooldown && !isPast && !isCurrentDay && "bg-orange-50 dark:bg-orange-950/20",
                    !isWE && !isSelected && !booking && !entry?.is_blocked && !isCooldown && !isPast && !isCurrentDay && inMonth && "bg-green-50 dark:bg-green-950/20",
                  )}
                  onMouseDown={() => handleDateMouseDown(dateStr)}
                  onMouseEnter={() => handleDateMouseEnter(dateStr)}
                  onTouchEnd={(e) => { e.preventDefault(); handleDateTap(dateStr); }}
                >
                  {/* Date number + indicators */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] sm:text-xs font-medium leading-none",
                      isCurrentDay && "text-primary font-bold",
                      !inMonth && "text-muted-foreground",
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {priceLevel && (
                        <div className={cn(
                          "h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full",
                          priceLevel === "low" && "bg-green-500",
                          priceLevel === "medium" && "bg-yellow-500",
                          priceLevel === "high" && "bg-red-500",
                        )} />
                      )}
                      {entry?.is_blocked && <Ban className="w-2.5 h-2.5 text-destructive hidden sm:block" />}
                    </div>
                  </div>

                  {/* Price */}
                  {entry && !entry.is_blocked && (
                    <p className="text-[9px] sm:text-xs font-semibold text-foreground mt-0.5 sm:mt-1 leading-tight truncate" title="Custom price">
                      ₹{entry.price >= 10000 ? `${(entry.price / 1000).toFixed(entry.price % 1000 === 0 ? 0 : 1)}k` : entry.price.toLocaleString("en-IN")}
                    </p>
                  )}
                  {!entry && !entry?.is_blocked && inMonth && (() => {
                    const basePrice = rooms.length > 0 ? (selectedRoom !== "all" ? rooms.find(r => r.id === selectedRoom)?.price : rooms[0]?.price) ?? 0 : 0;
                    if (!basePrice) return null;
                    const calcPrice = getDefaultPrice(day, basePrice);
                    return (
                      <p className="text-[9px] sm:text-xs font-medium text-muted-foreground/70 mt-0.5 sm:mt-1 leading-tight truncate italic" title="Calculated price (no custom entry)">
                        ₹{calcPrice >= 10000 ? `${(calcPrice / 1000).toFixed(calcPrice % 1000 === 0 ? 0 : 1)}k` : calcPrice.toLocaleString("en-IN")}
                      </p>
                    );
                  })()}

                  {/* Per-date cooldown badge */}
                  {entry?.cooldown_minutes != null && !entry.is_blocked && (
                    <p className="text-[7px] sm:text-[8px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 leading-tight hidden sm:block truncate" title={`Cool: ${formatCooldown(entry.cooldown_minutes)}`}>
                      ⏱ {formatCooldown(entry.cooldown_minutes)}
                    </p>
                  )}

                  {entry?.is_blocked && (
                    <p className="text-[8px] sm:text-[10px] text-destructive font-medium mt-0.5 leading-tight">Blocked</p>
                  )}

                  {/* Booking */}
                  {booking && (
                    <div className="mt-0.5" title={`${booking.guest_name} (${booking.status})`}>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[7px] sm:text-[9px] px-1 py-0 leading-tight",
                          booking.status === "confirmed" ? "bg-green-500/10 text-green-600 border-green-200" : "bg-yellow-500/10 text-yellow-600 border-yellow-200",
                        )}
                      >
                        <span className="hidden sm:inline">{booking.guest_name?.split(" ")[0] || "Booked"}</span>
                        <span className="sm:hidden">B</span>
                      </Badge>
                    </div>
                  )}

                  {/* Cooldown indicator */}
                  {isCooldown && !booking && (
                    <div className="mt-0.5" title={`${formatCooldown(entry?.cooldown_minutes ?? cooldownMinutes)} buffer`}>
                      <Badge
                        variant="secondary"
                        className="text-[7px] sm:text-[9px] px-1 py-0 leading-tight bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800"
                      >
                        <span className="hidden sm:inline"><Timer className="w-2 h-2 mr-0.5 inline" />{formatCooldown(entry?.cooldown_minutes ?? cooldownMinutes)}</span>
                        <span className="sm:hidden">⏳</span>
                      </Badge>
                    </div>
                  )}

                  {/* Special day */}
                  {specialDay && (
                    <div className={cn(
                      "mt-0.5 text-[7px] sm:text-[9px] leading-tight truncate font-medium rounded px-0.5 hidden sm:block",
                      specialDay.type === "indian" ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30" : "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30"
                    )} title={specialDay.label}>
                      {specialDay.emoji} {specialDay.label}
                    </div>
                  )}
                  {specialDay && (
                    <span className="sm:hidden text-[8px] leading-none block mt-0.5" title={specialDay.label}>{specialDay.emoji}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Low</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Medium</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> High</span>
        <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[7px] py-0 px-1 bg-green-500/10 text-green-600">B</Badge> Confirmed</span>
        <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[7px] py-0 px-1 bg-yellow-500/10 text-yellow-600">B</Badge> Pending</span>
        <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[7px] py-0 px-1 bg-amber-500/10 text-amber-600">⏳</Badge> Cool Time</span>
        <span className="hidden sm:inline">Click & drag to select · Tap on mobile</span>
      </div>

      {/* ─── Bulk Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={bulkDialogOpen} onOpenChange={v => { if (!v) closeBulkDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit {selectedDates.size} Date{selectedDates.size > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>

          {/* Selected dates preview */}
          {selectedDates.size <= 7 && (
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedDates).sort().map(d => (
                <Badge key={d} variant="outline" className="text-[10px]">{format(new Date(d), "dd MMM")}</Badge>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Price (₹)</Label>
              <Input type="number" min={100} max={100000} value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="Keep current" className="h-9" />
              {bulkPrice && validatePrice(bulkPrice) === null && (
                <p className="text-[10px] text-destructive mt-0.5">Must be ₹100 – ₹1,00,000</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Rooms Available</Label>
                <Input type="number" value={bulkAvailability} onChange={e => setBulkAvailability(e.target.value)} placeholder="Keep current" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Min Nights</Label>
                <Input type="number" value={bulkMinNights} onChange={e => setBulkMinNights(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cool Time Override</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {[
                  { label: "Default", value: "" },
                  { label: "5min", value: "5" },
                  { label: "15min", value: "15" },
                  { label: "25min", value: "25" },
                  { label: "30min", value: "30" },
                  { label: "1h", value: "60" },
                  { label: "2h", value: "120" },
                  { label: "6h", value: "360" },
                  { label: "12h", value: "720" },
                  { label: "24h", value: "1440" },
                  { label: "48h", value: "2880" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBulkCooldownMinutes(opt.value)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium border transition-all",
                      bulkCooldownMinutes === opt.value
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-muted border-border hover:border-amber-400"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {bulkCooldownMinutes === "" && (
                <p className="text-[10px] text-muted-foreground mt-1">Uses stay default: {formatCooldown(cooldownMinutes)}</p>
              )}
              {bulkCooldownMinutes !== "" && (
                <p className="text-[10px] text-amber-600 font-medium mt-1">Per-date override: {formatCooldown(parseInt(bulkCooldownMinutes))}</p>
              )}
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-xs font-medium">Block Dates</p>
                <p className="text-[10px] text-muted-foreground">Prevent bookings for these dates</p>
              </div>
              <Switch checked={bulkBlocked} onCheckedChange={setBulkBlocked} />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={resetPricing}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to Default
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={closeBulkDialog}>Cancel</Button>
              <Button size="sm" onClick={saveBulkPricing}>Apply</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Weekend Pricing Dialog ─────────────────────────────────────── */}
      <Dialog open={weekendDialogOpen} onOpenChange={setWeekendDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Weekend Pricing — {format(currentDate, "MMM yyyy")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Weekday (Mon–Thu)</Label>
              <Input type="number" min={100} max={100000} value={weekdayPrice} onChange={e => setWeekdayPrice(e.target.value)} placeholder="₹" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Weekend (Fri–Sun)</Label>
              <Input type="number" min={100} max={100000} value={weekendPrice} onChange={e => setWeekendPrice(e.target.value)} placeholder="₹" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWeekendDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveWeekendPricing}>Apply to {format(currentDate, "MMMM")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Seasonal Pricing Dialog ────────────────────────────────────── */}
      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Seasonal Pricing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Season Name</Label>
              <Input value={seasonName} onChange={e => setSeasonName(e.target.value)} placeholder="e.g. Christmas Season" className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Price Override (₹)</Label>
              <Input type="number" min={100} max={100000} value={seasonPrice} onChange={e => setSeasonPrice(e.target.value)} placeholder="₹" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSeasonDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveSeasonalPricing}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Copy Pricing Dialog ────────────────────────────────────────── */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Copy Pricing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Copy from date</Label>
              <Input type="date" value={copySourceDate} onChange={e => setCopySourceDate(e.target.value)} className="h-9" />
            </div>
            <p className="text-xs text-muted-foreground">Will apply to {selectedDates.size} selected date{selectedDates.size !== 1 ? "s" : ""}.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveCopyPricing}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cool Time Dialog ──────────────────────────────────────────── */}
      <Dialog open={cooldownDialogOpen} onOpenChange={setCooldownDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-600" /> Cool Time Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Buffer period after each checkout before the next guest can check in. Prevents back-to-back bookings and allows time for cleaning & preparation.
              </p>
            </div>

            {/* Minutes presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Quick Minutes</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "None", value: 0 },
                  { label: "5min", value: 5 },
                  { label: "15min", value: 15 },
                  { label: "25min", value: 25 },
                  { label: "30min", value: 30 },
                  { label: "45min", value: 45 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCooldownMinutes(opt.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-center transition-all border text-xs font-medium",
                      cooldownMinutes === opt.value
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-muted border-border hover:border-amber-400"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Quick Hours / Days</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "1h", value: 60 },
                  { label: "2h", value: 120 },
                  { label: "6h", value: 360 },
                  { label: "12h", value: 720 },
                  { label: "24h", value: 1440 },
                  { label: "36h", value: 2160 },
                  { label: "48h", value: 2880 },
                  { label: "3d", value: 4320 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCooldownMinutes(opt.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-center transition-all border text-xs font-medium",
                      cooldownMinutes === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border hover:border-primary/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Custom Minutes</Label>
              <Input
                type="number"
                min={0}
                max={10080}
                value={cooldownMinutes}
                onChange={e => setCooldownMinutes(Math.max(0, Math.min(10080, parseInt(e.target.value) || 0)))}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                = {formatCooldown(cooldownMinutes)}
                {cooldownMinutes === 0 && " (no buffer — back-to-back allowed)"}
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium">Per-Date Override</p>
                <p className="text-[10px] text-muted-foreground">
                  Override cool time for specific dates in the bulk edit dialog. Per-date settings take priority over this global default.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCooldownDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveCooldown} disabled={savingCooldown}>
              {savingCooldown ? "Saving..." : "Save Cool Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
