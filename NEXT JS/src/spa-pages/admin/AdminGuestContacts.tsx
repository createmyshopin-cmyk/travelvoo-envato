import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import {
  User,
  Users,
  IndianRupee,
  MessageCircle,
  Mail,
  Search,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  XCircle,
  Crown,
  Award,
  Star,
  Gift,
  Building2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPhoneForWhatsApp } from "@/lib/countryCodes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StayMap {
  [id: string]: { name: string; stay_id: string };
}

interface GuestContact {
  key: string;
  name: string;
  email: string;
  phone: string;
  phone_country_code?: string;
  totalBookings: number;
  totalSpend: number;
  bookedStays: string[];
  lastBookingDate: string | null;
  tier: "new" | "returning" | "loyal" | "vip";
}

type SortKey = "totalBookings" | "totalSpend" | "name" | "lastBookingDate";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function whatsappUrl(phone: string, text: string, countryCode?: string): string {
  const num = formatPhoneForWhatsApp(phone, countryCode);
  if (!num) return "#";
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function getTier(bookings: number): GuestContact["tier"] {
  if (bookings >= 7) return "vip";
  if (bookings >= 4) return "loyal";
  if (bookings >= 2) return "returning";
  return "new";
}

const TIER_CONFIG: Record<
  GuestContact["tier"],
  { label: string; icon: typeof Crown; className: string }
> = {
  new: {
    label: "New Guest",
    icon: User,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  returning: {
    label: "Returning",
    icon: Star,
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400",
  },
  loyal: {
    label: "Loyal",
    icon: Award,
    className:
      "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300",
  },
  vip: {
    label: "VIP",
    icon: Crown,
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
};

function randomCode(): string {
  const words = ["LOYAL", "VIP", "THANKS", "STAY", "GIFT"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${w}${n}`;
}

function exportGuestContactsCSV(guests: GuestContact[]) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Total Bookings",
    "Total Spend",
    "Tier",
    "Booked Stays",
    "Last Booking",
  ];
  const rows = guests.map((g) => [
    g.name,
    g.email || "",
    g.phone || "",
    g.totalBookings,
    g.totalSpend,
    g.tier,
    g.bookedStays.join("; "),
    g.lastBookingDate ? format(parseISO(g.lastBookingDate), "yyyy-MM-dd") : "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `guest-contacts-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminGuestContacts() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [stays, setStays] = useState<StayMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalBookings");
  const [sortAsc, setSortAsc] = useState(false);
  const [discountGuest, setDiscountGuest] = useState<GuestContact | null>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  const fetchData = useCallback(async () => {
    const [{ data: bk }, { data: st }] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .in("status", ["confirmed", "pending"])
        .order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name, stay_id"),
    ]);
    if (bk) setBookings(bk);
    if (st) {
      const map: StayMap = {};
      st.forEach((s: any) => {
        map[s.id] = { name: s.name, stay_id: s.stay_id };
      });
      setStays(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate guests from bookings
  const guests = useMemo((): GuestContact[] => {
    const map = new Map<string, GuestContact>();

    for (const b of bookings) {
      const phone = (b.phone || "").trim();
      const email = (b.email || "").trim().toLowerCase();
      const key = phone || email || `anon-${b.id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: b.guest_name || "Unknown",
          email: email || "",
          phone: phone || "",
          phone_country_code: b.phone_country_code || "91",
          totalBookings: 0,
          totalSpend: 0,
          bookedStays: [],
          lastBookingDate: null,
          tier: "new",
        });
      }

      const g = map.get(key)!;
      const date = b.checkin || b.created_at;
      if (date && (!g.lastBookingDate || date > g.lastBookingDate)) {
        g.lastBookingDate = date;
        g.phone_country_code = b.phone_country_code || g.phone_country_code || "91";
      }
      if (b.status === "confirmed") {
        g.totalBookings += 1;
        g.totalSpend += b.total_price || 0;
      }
      if (b.stay_id && stays[b.stay_id]) {
        const stayName = stays[b.stay_id].name;
        if (!g.bookedStays.includes(stayName)) g.bookedStays.push(stayName);
      }
    }

    const list = Array.from(map.values());
    list.forEach((g) => {
      g.tier = getTier(g.totalBookings);
    });
    return list;
  }, [bookings, stays]);

  const filtered = useMemo(() => {
    let list = [...guests];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.email.toLowerCase().includes(q) ||
          g.phone.includes(q) ||
          g.bookedStays.some((s) => s.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      let va: any = a[sortKey];
      let vb: any = b[sortKey];
      if (sortKey === "lastBookingDate") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (sortKey === "name") {
        const cmp = (va || "").localeCompare(vb || "");
        return sortAsc ? cmp : -cmp;
      }
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : 0;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [guests, search, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const vip = guests.filter((g) => g.tier === "vip").length;
    const returning = guests.filter((g) => g.tier === "returning" || g.tier === "loyal").length;
    const totalSpend = guests.reduce((s, g) => s + g.totalSpend, 0);
    return { total: guests.length, vip, returning, totalSpend };
  }, [guests]);

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(key === "totalBookings" || key === "totalSpend" ? false : true);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  const clearFilters = () => setSearch("");

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Guest Contacts
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Unique guests from bookings · Most frequent bookers at the top
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchData} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => exportGuestContactsCSV(filtered)}
            disabled={loading || filtered.length === 0}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            label: "Total Guests",
            value: loading ? "…" : stats.total,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "VIP Guests",
            value: loading ? "…" : stats.vip,
            icon: Crown,
            color: "text-yellow-600",
            bg: "bg-yellow-50 dark:bg-yellow-950/30",
          },
          {
            label: "Returning",
            value: loading ? "…" : stats.returning,
            icon: Star,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/30",
          },
          {
            label: "Total Spend",
            value: loading ? "…" : `₹${stats.totalSpend.toLocaleString("en-IN")}`,
            icon: IndianRupee,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
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

      {/* Search + Sort */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, stay..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs sm:text-sm"
          />
          {search && (
            <button
              onClick={clearFilters}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Sort:
          {(
            [
              ["totalBookings", "Bookings"],
              ["totalSpend", "Spend"],
              ["name", "Name"],
              ["lastBookingDate", "Last Stay"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => sortBy(k)}
              className={cn(
                "flex items-center gap-0.5 px-2 py-1 rounded-md transition-colors",
                sortKey === k ? "bg-muted font-semibold text-foreground" : "hover:bg-muted/60"
              )}
            >
              {label}
              <SortIcon k={k} />
            </button>
          ))}
        </div>
      </div>

      {/* Guest Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading guests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No guests found</p>
            {search && (
              <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          filtered.map((g, i) => {
            const tierConf = TIER_CONFIG[g.tier];
            return (
              <motion.div
                key={g.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="rounded-xl border bg-card hover:shadow-md transition-shadow"
              >
                <div className="p-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{g.name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-1 text-[10px] py-0 px-1.5 flex items-center gap-1 w-fit",
                          tierConf.className
                        )}
                      >
                        <tierConf.icon className="w-3 h-3" />
                        {tierConf.label}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-primary tabular-nums">
                        ₹{g.totalSpend.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{g.totalBookings} stays</p>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {g.email && (
                      <a
                        href={`mailto:${g.email}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary truncate"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{g.email}</span>
                      </a>
                    )}
                    {g.phone && (
                      <a
                        href={whatsappUrl(g.phone, `Hi ${g.name}, `, g.phone_country_code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-green-600 hover:underline truncate"
                      >
                        <MessageCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{g.phone}</span>
                      </a>
                    )}
                  </div>

                  {g.bookedStays.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {g.bookedStays.slice(0, 3).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-[9px] py-0 px-1 bg-muted/50"
                        >
                          <Building2 className="w-2.5 h-2.5 mr-0.5" />
                          {s}
                        </Badge>
                      ))}
                      {g.bookedStays.length > 3 && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1">
                          +{g.bookedStays.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {g.lastBookingDate && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last stay: {format(parseISO(g.lastBookingDate), "dd MMM yyyy")}
                    </p>
                  )}
                </div>

                <div className="border-t bg-muted/20 px-2.5 py-2 flex gap-1.5">
                  <a
                    href={whatsappUrl(g.phone, `Hi ${g.name}, `, g.phone_country_code)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-8 rounded-lg bg-green-500/10 flex items-center justify-center gap-1.5 hover:bg-green-500/20"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] font-medium text-green-600">WhatsApp</span>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 shrink-0"
                    onClick={() => setDiscountGuest(g)}
                  >
                    <Gift className="w-3.5 h-3.5 mr-1" />
                    <span className="text-[10px]">Discount</span>
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Showing {filtered.length} of {guests.length} guest{guests.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Give Discount Dialog */}
      <GiveDiscountDialog
        guest={discountGuest}
        onClose={() => setDiscountGuest(null)}
        onSuccess={() => {
          setDiscountGuest(null);
          toast({ title: "Coupon created", description: "Copied to clipboard. You can share via WhatsApp." });
        }}
        tenantId={tenantId}
        toast={toast}
      />
    </div>
  );
}

// ─── Give Discount Dialog ─────────────────────────────────────────────────────

interface GiveDiscountDialogProps {
  guest: GuestContact | null;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string | null;
  toast: ReturnType<typeof useToast>["toast"];
}

function GiveDiscountDialog({ guest, onClose, onSuccess, tenantId, toast }: GiveDiscountDialogProps) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState(10);
  const [minPurchase, setMinPurchase] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [usageLimit, setUsageLimit] = useState("1");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    const base = guest?.name ? guest.name.replace(/\s+/g, "").toUpperCase().slice(0, 6) : "LOYAL";
    setCode(`LOYAL-${base}-${randomCode().slice(-4)}`);
    setType("percent");
    setValue(10);
    setMinPurchase(0);
    setExpiresAt(undefined);
    setUsageLimit("1");
  };

  useEffect(() => {
    if (guest) {
      reset();
    }
  }, [guest]);

  const handleCreate = async () => {
    if (!guest || !code.trim()) return;
    setSaving(true);

    const payload = {
      code: code.trim().toUpperCase(),
      description: `Loyalty discount for ${guest.name}`,
      type: type === "percent" ? "percent" : "flat",
      value: type === "percent" ? Math.min(100, value) : value,
      min_purchase: minPurchase || 0,
      max_discount: null,
      active: true,
      usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      expires_at: expiresAt ? expiresAt.toISOString().slice(0, 10) : null,
      applicable_stay_ids: null,
      tenant_id: tenantId,
    };

    const { error } = await supabase.from("coupons").insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const discountText =
      type === "percent"
        ? `${value}% off`
        : `₹${value.toLocaleString("en-IN")} off`;
    const message = `Hi ${guest.name}! Thank you for being a valued guest. Use coupon ${code.trim().toUpperCase()} for ${discountText} on your next stay!`;
    const waUrl = whatsappUrl(guest.phone, message, guest.phone_country_code);

    await navigator.clipboard.writeText(message);
    onSuccess();
    setSaving(false);

    // Open WhatsApp in new tab
    window.open(waUrl, "_blank");
  };

  if (!guest) return null;

  return (
    <Dialog open={!!guest} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Give Discount to {guest.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LOYAL-XXX-1234" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: "percent" | "flat") => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="flat">Flat (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min={1}
                max={type === "percent" ? 100 : 99999}
                value={value}
                onChange={(e) => setValue(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min. Purchase (₹)</Label>
              <Input
                type="number"
                min={0}
                value={minPurchase}
                onChange={(e) => setMinPurchase(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Usage Limit</Label>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expires (optional)</Label>
            <Input
              type="date"
              value={expiresAt ? format(expiresAt, "yyyy-MM-dd") : ""}
              onChange={(e) => setExpiresAt(e.target.value ? parseISO(e.target.value) : undefined)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !code.trim()}>
            {saving ? "Creating…" : "Create & Share via WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
