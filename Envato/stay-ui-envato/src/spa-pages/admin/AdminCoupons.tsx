import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isFuture, differenceInDays, isWithinInterval } from "date-fns";
import {
  Plus, Pencil, Trash2, Tag, Copy, Check, RefreshCw,
  Shuffle, TrendingUp, ToggleLeft, ToggleRight, Search,
  ChevronDown, ChevronUp, IndianRupee, Percent,
  Layers, Share2, CalendarIcon, Clock, AlertTriangle,
  Download, MoreHorizontal, CheckSquare, XCircle,
  Timer, Infinity as InfinityIcon, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  min_purchase: number;
  max_discount: number | null;
  active: boolean;
  usage_count: number;
  usage_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  applicable_stay_ids: string[] | null;
  created_at: string;
}

interface CouponForm {
  code: string;
  description: string;
  type: string;
  value: number;
  min_purchase: number;
  max_discount: string;
  active: boolean;
  usage_limit: string;
  starts_at: Date | undefined;
  expires_at: Date | undefined;
}

type SortKey = "code" | "value" | "usage_count" | "created_at" | "expires_at";
type StatusTab = "all" | "active" | "expired" | "scheduled" | "exhausted" | "inactive";

const EMPTY: CouponForm = {
  code: "", description: "", type: "percent", value: 10,
  min_purchase: 0, max_discount: "", active: true,
  usage_limit: "", starts_at: undefined, expires_at: undefined,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomCode() {
  const words = ["STAY", "RESORT", "ESCAPE", "WAYANAD", "WILD", "GREEN", "LEAF", "HILL", "SAVE", "DEAL"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${w}${n}`;
}

function discountLabel(c: Coupon) {
  return c.type === "percent" || c.type === "percentage"
    ? `${c.value}% OFF`
    : `₹${c.value.toLocaleString("en-IN")} OFF`;
}

type CouponStatus = "active" | "expired" | "scheduled" | "exhausted" | "inactive";

function getCouponStatus(c: Coupon): CouponStatus {
  if (!c.active) return "inactive";
  if (c.usage_limit && c.usage_count >= c.usage_limit) return "exhausted";
  if (c.expires_at && isPast(new Date(c.expires_at))) return "expired";
  if (c.starts_at && isFuture(new Date(c.starts_at))) return "scheduled";
  return "active";
}

function getStatusBadge(status: CouponStatus) {
  switch (status) {
    case "active":
      return { label: "Active", className: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800" };
    case "expired":
      return { label: "Expired", className: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800" };
    case "scheduled":
      return { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800" };
    case "exhausted":
      return { label: "Limit Reached", className: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800" };
    case "inactive":
      return { label: "Inactive", className: "bg-gray-500/10 text-gray-500 border-gray-200 dark:border-gray-700" };
  }
}

function getExpiryLabel(c: Coupon): string | null {
  if (!c.expires_at) return null;
  const expiresAt = new Date(c.expires_at);
  if (isPast(expiresAt)) return "Expired";
  const daysLeft = differenceInDays(expiresAt, new Date());
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Expires tomorrow";
  if (daysLeft <= 7) return `${daysLeft}d left`;
  return format(expiresAt, "dd MMM yyyy");
}

function exportCSV(coupons: Coupon[]) {
  const headers = ["Code", "Description", "Type", "Value", "Min Purchase", "Max Discount", "Usage Count", "Usage Limit", "Status", "Starts At", "Expires At", "Created At"];
  const rows = coupons.map(c => [
    c.code,
    c.description || "",
    c.type,
    c.value,
    c.min_purchase,
    c.max_discount ?? "",
    c.usage_count,
    c.usage_limit ?? "Unlimited",
    getCouponStatus(c),
    c.starts_at ? format(new Date(c.starts_at), "yyyy-MM-dd HH:mm") : "",
    c.expires_at ? format(new Date(c.expires_at), "yyyy-MM-dd HH:mm") : "",
    format(new Date(c.created_at), "yyyy-MM-dd HH:mm"),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coupons-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Date Picker Component ───────────────────────────────────────────────────

function DatePicker({ date, onSelect, placeholder, minDate }: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
  minDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { onSelect(d); setOpen(false); }}
          disabled={minDate ? (day) => day < minDate : undefined}
          initialFocus
        />
        {date && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { onSelect(undefined); setOpen(false); }}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Live Preview Card ────────────────────────────────────────────────────────

function CouponPreview({ form }: { form: CouponForm }) {
  const code = form.code || "YOURCODE";
  const isPercent = form.type === "percent" || form.type === "percentage";
  const discount = isPercent ? `${form.value}% OFF` : `₹${Number(form.value).toLocaleString("en-IN")} OFF`;

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-orange-50 dark:to-orange-950/20 p-4">
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-dashed border-primary/30" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-dashed border-primary/30" />
      <div className="absolute top-0 left-0 right-0 border-b border-dashed border-primary/20" style={{ top: "44%" }} />

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Coupon Code</span>
        <Badge variant={form.active ? "default" : "secondary"} className="text-[10px]">
          {form.active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <p className="text-2xl font-black tracking-widest text-primary font-mono">{code.toUpperCase()}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{discount}</p>
      {form.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{form.description}</p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
        {form.min_purchase > 0 && <span>Min ₹{Number(form.min_purchase).toLocaleString("en-IN")}</span>}
        {form.max_discount && <span>Cap ₹{Number(form.max_discount).toLocaleString("en-IN")}</span>}
        {form.usage_limit && <span>Limit: {form.usage_limit} uses</span>}
        {form.expires_at && <span>Until {format(form.expires_at, "dd MMM")}</span>}
      </div>
    </div>
  );
}

// ─── Usage Progress Bar ──────────────────────────────────────────────────────

function UsageBar({ count, limit }: { count: number; limit: number | null }) {
  if (!limit) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-sm">{count}</span>
        <InfinityIcon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }
  const pct = Math.min(100, (count / limit) * 100);
  const isNearLimit = pct >= 80;
  const isExhausted = count >= limit;

  return (
    <div className="space-y-1 min-w-[80px]">
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-semibold", isExhausted ? "text-red-500" : isNearLimit ? "text-orange-500" : "text-foreground")}>
          {count}/{limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", isExhausted ? "bg-red-500" : isNearLimit ? "bg-orange-400" : "bg-green-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchCoupons = useCallback(async () => {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  // ── Filtered + sorted list ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...coupons];
    if (search) list = list.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()));
    if (statusTab !== "all") list = list.filter(c => getCouponStatus(c) === statusTab);
    list.sort((a, b) => {
      let va: string | number | null = a[sortKey] ?? "";
      let vb: string | number | null = b[sortKey] ?? "";
      if (sortKey === "expires_at") {
        va = va ? new Date(va as string).getTime() : Infinity;
        vb = vb ? new Date(vb as string).getTime() : Infinity;
      }
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [coupons, search, statusTab, sortKey, sortAsc]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const statusCounts = { active: 0, expired: 0, scheduled: 0, exhausted: 0, inactive: 0 };
    let totalUses = 0;
    let topCoupon: Coupon | null = null;
    let expiringSoon = 0;

    for (const c of coupons) {
      const s = getCouponStatus(c);
      statusCounts[s]++;
      totalUses += c.usage_count || 0;
      if (!topCoupon || (c.usage_count || 0) > (topCoupon.usage_count || 0)) topCoupon = c;
      if (c.expires_at && !isPast(new Date(c.expires_at))) {
        const days = differenceInDays(new Date(c.expires_at), new Date());
        if (days <= 7 && days >= 0) expiringSoon++;
      }
    }
    return { ...statusCounts, totalUses, topCoupon, expiringSoon, total: coupons.length };
  }, [coupons]);

  // ── Selection ────────────────────────────────────────────────────────────

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Handlers ────────────────────────────────────────────────────────────

  const openAdd = () => { setEditCoupon(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditCoupon(c);
    setForm({
      code: c.code,
      description: c.description || "",
      type: c.type,
      value: c.value,
      min_purchase: c.min_purchase,
      max_discount: c.max_discount?.toString() || "",
      active: c.active,
      usage_limit: c.usage_limit?.toString() || "",
      starts_at: c.starts_at ? new Date(c.starts_at) : undefined,
      expires_at: c.expires_at ? new Date(c.expires_at) : undefined,
    });
    setFormOpen(true);
  };

  const duplicate = (c: Coupon) => {
    setEditCoupon(null);
    setForm({
      code: c.code + "_COPY",
      description: c.description || "",
      type: c.type,
      value: c.value,
      min_purchase: c.min_purchase,
      max_discount: c.max_discount?.toString() || "",
      active: false,
      usage_limit: c.usage_limit?.toString() || "",
      starts_at: c.starts_at ? new Date(c.starts_at) : undefined,
      expires_at: c.expires_at ? new Date(c.expires_at) : undefined,
    });
    setFormOpen(true);
    toast({ title: "Duplicated", description: "Edit the code and activate when ready." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;

    if (form.type === "percent" && (form.value < 1 || form.value > 100)) {
      toast({ title: "Invalid value", description: "Percentage must be between 1 and 100.", variant: "destructive" });
      return;
    }
    if (form.starts_at && form.expires_at && form.starts_at >= form.expires_at) {
      toast({ title: "Invalid dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      min_purchase: Number(form.min_purchase),
      max_discount: form.max_discount ? parseInt(form.max_discount) : null,
      active: form.active,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      starts_at: form.starts_at ? form.starts_at.toISOString() : null,
      expires_at: form.expires_at ? form.expires_at.toISOString() : null,
    };

    let error;
    if (editCoupon) {
      ({ error } = await supabase.from("coupons").update(payload).eq("id", editCoupon.id));
    } else {
      ({ error } = await supabase.from("coupons").insert([payload]));
    }

    if (error) {
      const msg = error.message.includes("duplicate") ? "A coupon with this code already exists." : error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } else {
      toast({ title: editCoupon ? "Coupon updated" : "Coupon created!" });
      fetchCoupons();
      setFormOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("coupons").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coupon deleted" });
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteId); return n; });
      fetchCoupons();
    }
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("coupons").delete().in("id", ids);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} coupon(s) deleted` });
      setSelectedIds(new Set());
      fetchCoupons();
    }
    setBulkDeleteOpen(false);
  };

  const bulkToggle = async (activate: boolean) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("coupons").update({ active: activate }).in("id", ids);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} coupon(s) ${activate ? "activated" : "deactivated"}` });
      setSelectedIds(new Set());
      fetchCoupons();
    }
  };

  const toggleActive = async (c: Coupon) => {
    setToggling(c.id);
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (!error) setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
    else toast({ title: "Error", description: error.message, variant: "destructive" });
    setToggling(null);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      toast({ title: "Copied!", description: `${code} copied to clipboard` });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const shareCode = (c: Coupon) => {
    const lines = [`🎉 Use code *${c.code}* to get ${discountLabel(c)} on your next booking!`];
    if (c.min_purchase > 0) lines.push(`🛒 Min booking: ₹${c.min_purchase.toLocaleString("en-IN")}`);
    if (c.max_discount) lines.push(`💰 Max discount: ₹${c.max_discount.toLocaleString("en-IN")}`);
    if (c.expires_at) lines.push(`⏰ Valid until: ${format(new Date(c.expires_at), "dd MMM yyyy")}`);
    const text = lines.join("\n");
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "Share this text with your guests." });
    }
  };

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortAsc(s => !s);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" /> Coupons
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} total · {stats.active} active
            {stats.expiringSoon > 0 && <span className="text-orange-500 ml-1">· {stats.expiringSoon} expiring soon</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(coupons)} title="Export CSV">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> New Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active", value: loading ? "…" : stats.active, icon: Tag, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Total Uses", value: loading ? "…" : stats.totalUses, icon: TrendingUp, color: "text-primary", bg: "bg-primary/5" },
          { label: "Expiring Soon", value: loading ? "…" : stats.expiringSoon, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Top Coupon", value: loading ? "…" : stats.topCoupon?.code || "—", icon: IndianRupee, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
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

      {/* Status Tabs */}
      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as StatusTab); setSelectedIds(new Set()); }}>
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs">Scheduled ({stats.scheduled})</TabsTrigger>
          <TabsTrigger value="expired" className="text-xs">Expired ({stats.expired})</TabsTrigger>
          <TabsTrigger value="exhausted" className="text-xs">Exhausted ({stats.exhausted})</TabsTrigger>
          <TabsTrigger value="inactive" className="text-xs">Inactive ({stats.inactive})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + Bulk Actions */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search code or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs font-medium text-muted-foreground">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => bulkToggle(true)}>
                <ToggleRight className="w-3.5 h-3.5 mr-1" /> Activate
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkToggle(false)}>
                <ToggleLeft className="w-3.5 h-3.5 mr-1" /> Deactivate
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <XCircle className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected && filtered.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 font-semibold" onClick={() => sortBy("code")}>
                  Code <SortIcon k="code" />
                </button>
              </TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className="hidden md:table-cell">Min Order</TableHead>
              <TableHead>
                <button className="flex items-center gap-1 font-semibold" onClick={() => sortBy("usage_count")}>
                  Usage <SortIcon k="usage_count" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 font-semibold" onClick={() => sortBy("expires_at")}>
                  Expiry <SortIcon k="expires_at" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading coupons...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No coupons found</p>
                  {search && <p className="text-xs mt-1">Try a different search term</p>}
                  {statusTab !== "all" && !search && (
                    <Button variant="link" size="sm" className="mt-2" onClick={() => setStatusTab("all")}>View all coupons</Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((c, i) => {
                  const status = getCouponStatus(c);
                  const badge = getStatusBadge(status);
                  const expiryLabel = getExpiryLabel(c);
                  const isExpiringSoon = c.expires_at && !isPast(new Date(c.expires_at)) && differenceInDays(new Date(c.expires_at), new Date()) <= 7;

                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/30 transition-colors",
                        selectedIds.has(c.id) && "bg-primary/5",
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                          aria-label={`Select ${c.code}`}
                        />
                      </TableCell>

                      {/* Code + Description */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground tracking-wider">{c.code}</span>
                            <button
                              onClick={() => copyCode(c.code, c.id)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {copiedId === c.id
                                ? <Check className="w-3.5 h-3.5 text-green-500" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {c.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[180px]">{c.description}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Discount */}
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 font-bold text-sm ${
                          c.type === "percent" || c.type === "percentage" ? "text-purple-600" : "text-primary"
                        }`}>
                          {c.type === "percent" || c.type === "percentage"
                            ? <><Percent className="w-3.5 h-3.5" />{c.value}%</>
                            : <><IndianRupee className="w-3.5 h-3.5" />₹{c.value.toLocaleString("en-IN")}</>}
                        </span>
                        {c.max_discount && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Cap ₹{c.max_discount.toLocaleString("en-IN")}</p>
                        )}
                      </TableCell>

                      {/* Min Purchase */}
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                        {c.min_purchase > 0 ? `₹${c.min_purchase.toLocaleString("en-IN")}` : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>

                      {/* Usage */}
                      <TableCell>
                        <UsageBar count={c.usage_count || 0} limit={c.usage_limit} />
                      </TableCell>

                      {/* Expiry */}
                      <TableCell>
                        {expiryLabel ? (
                          <div className={cn("flex items-center gap-1 text-xs", isExpiringSoon ? "text-orange-500 font-medium" : status === "expired" ? "text-red-500" : "text-muted-foreground")}>
                            {isExpiringSoon ? <AlertTriangle className="w-3 h-3" /> : status === "expired" ? <Clock className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
                            {expiryLabel}
                          </div>
                        ) : c.starts_at && isFuture(new Date(c.starts_at)) ? (
                          <div className="flex items-center gap-1 text-xs text-blue-500">
                            <Timer className="w-3 h-3" />
                            Starts {format(new Date(c.starts_at), "dd MMM")}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">No expiry</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <button
                          onClick={() => toggleActive(c)}
                          disabled={toggling === c.id}
                          className="flex items-center gap-1.5 group"
                        >
                          {toggling === c.id
                            ? <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                            : c.active
                              ? <ToggleRight className="w-5 h-5 text-green-500" />
                              : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          }
                          <Badge variant="secondary" className={cn("text-[10px]", badge.className)}>
                            {badge.label}
                          </Badge>
                        </button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => shareCode(c)}>
                              <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyCode(c.code, c.id)}>
                              <Copy className="w-3.5 h-3.5 mr-2" /> Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(c)}>
                              <Layers className="w-3.5 h-3.5 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-destructive focus:text-destructive">
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

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {coupons.length} coupon{coupons.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ─── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              {editCoupon ? "Edit Coupon" : "Create New Coupon"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live preview */}
            <CouponPreview form={form} />

            {/* Code */}
            <div className="space-y-1.5">
              <Label>Coupon Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. STAY500"
                  className="font-mono font-bold tracking-widest uppercase flex-1"
                  required
                />
                <Button type="button" variant="outline" size="icon" title="Generate random code" onClick={() => setForm({ ...form, code: randomCode() })}>
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(internal note)</span></Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Summer sale campaign, influencer code..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount Type *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">
                      <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-purple-500" /> Percentage (%)</div>
                    </SelectItem>
                    <SelectItem value="flat">
                      <div className="flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Flat Amount (₹)</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {form.type === "percent" || form.type === "percentage" ? "Discount (%)" : "Discount (₹)"} *
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={form.type === "percent" ? 100 : undefined}
                  value={form.value}
                  onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            {/* Min + Max */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Order (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_purchase}
                  onChange={e => setForm({ ...form, min_purchase: Number(e.target.value) })}
                  placeholder="0 = no minimum"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Discount Cap (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_discount}
                  onChange={e => setForm({ ...form, max_discount: e.target.value })}
                  placeholder="No cap"
                />
              </div>
            </div>

            {/* Usage Limit */}
            <div className="space-y-1.5">
              <Label>Usage Limit</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={1}
                  value={form.usage_limit}
                  onChange={e => setForm({ ...form, usage_limit: e.target.value })}
                  placeholder="Unlimited"
                  className="flex-1"
                />
                {form.usage_limit && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, usage_limit: "" })} className="text-xs text-muted-foreground">
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Leave blank for unlimited usage</p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starts At</Label>
                <DatePicker
                  date={form.starts_at}
                  onSelect={d => setForm({ ...form, starts_at: d })}
                  placeholder="Immediately"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expires At</Label>
                <DatePicker
                  date={form.expires_at}
                  onSelect={d => setForm({ ...form, expires_at: d })}
                  placeholder="Never"
                  minDate={form.starts_at || new Date()}
                />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Guests can use this coupon immediately</p>
              </div>
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {saving ? "Saving..." : editCoupon ? "Update Coupon" : "Create Coupon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Single Dialog ───────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{coupons.find(c => c.id === deleteId)?.code}</strong>. Guests who have this code will no longer be able to use it.
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

      {/* ─── Bulk Delete Dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Coupon{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected coupons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedIds.size} coupon{selectedIds.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
