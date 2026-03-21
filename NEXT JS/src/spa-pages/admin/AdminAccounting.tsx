import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Download, MoreHorizontal, RefreshCw, Plus, CalendarIcon,
  IndianRupee, TrendingUp, TrendingDown, Wallet, PiggyBank,
  BookOpen, Receipt, FileText, ArrowUpRight, ArrowDownRight,
  Percent, ChevronDown, ChevronUp, XCircle, Trash2, Edit, Copy,
  Check, BarChart3, Filter, CheckCircle2, Clock,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxnType = "income" | "expense" | "commission";
type TabFilter = "all" | TxnType;

interface Txn {
  id: string;
  type: TxnType;
  category: string;
  description: string;
  amount: number;
  date: string;
  booking_id: string | null;
  invoice_id: string | null;
  quotation_id: string | null;
  stay_id: string | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

interface BookingRef {
  id: string;
  booking_id: string;
  guest_name: string;
  total_price: number;
  checkin: string | null;
  checkout: string | null;
  status: string;
}

interface InvoiceRef {
  id: string;
  invoice_id: string;
  guest_name: string;
  total_price: number;
  payment_status: string;
}

interface QuotationRef {
  id: string;
  quote_id: string;
  guest_name: string;
  total_price: number;
  status: string;
}

interface StayRef {
  id: string;
  name: string;
}

interface LedgerEntry {
  id: string;
  booking_id: string;
  label: string;
  amount: number;
  type: TxnType;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  "booking_income", "room_revenue", "addon_revenue", "commission",
  "maintenance", "utilities", "salary", "marketing", "supplies",
  "tax", "refund", "platform_fee", "cleaning", "insurance", "other",
];

const PAYMENT_METHODS = ["cash", "by_hand_cash", "upi", "bank_transfer", "card", "cheque", "online", "other"];

const TYPE_CONFIG: Record<TxnType, { label: string; icon: typeof ArrowUpRight; color: string; bg: string }> = {
  income: { label: "Income", icon: ArrowUpRight, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  expense: { label: "Expense", icon: ArrowDownRight, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  commission: { label: "Commission", icon: Percent, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
};

const PIE_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(data: Txn[]) {
  const headers = ["Date", "Type", "Category", "Description", "Amount", "Payment Method", "Reference", "Notes"];
  const rows = data.map(t => [
    t.date, t.type, t.category, `"${t.description}"`, t.amount,
    t.payment_method || "", t.reference_number || "", `"${t.notes || ""}"`,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `accounting_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function categoryLabel(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function generateRefNumber(type: TxnType) {
  const prefix = type === "income" ? "INC" : type === "expense" ? "EXP" : "COM";
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${ts}${rand}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAccounting() {
  const { toast } = useToast();

  // Data
  const [txns, setTxns] = useState<Txn[]>([]);
  const [bookings, setBookings] = useState<BookingRef[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRef[]>([]);
  const [quotations, setQuotations] = useState<QuotationRef[]>([]);
  const [stays, setStays] = useState<StayRef[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerBookingId, setLedgerBookingId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<"area" | "bar" | "pie">("area");

  // Form state
  const [form, setForm] = useState({
    type: "income" as TxnType,
    category: "general",
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "cash",
    reference_number: "",
    notes: "",
    booking_id: "",
    invoice_id: "",
    stay_id: "",
    tags: "",
  });
  const [editId, setEditId] = useState<string | null>(null);

  // Ledger form
  const [ledgerForm, setLedgerForm] = useState({
    label: "", amount: "", type: "income" as TxnType, notes: "",
  });

  const [setupNeeded, setSetupNeeded] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const tRes = await supabase.from("accounting_transactions").select("*").order("date", { ascending: false });
    if (tRes.error && tRes.error.message.includes("schema cache")) {
      setSetupNeeded(true);
      setLoading(false);
      return;
    }
    const [bRes, iRes, qRes, sRes, lRes] = await Promise.all([
      supabase.from("bookings").select("id, booking_id, guest_name, total_price, checkin, checkout, status").order("created_at", { ascending: false }).limit(500),
      supabase.from("invoices").select("id, invoice_id, guest_name, total_price, payment_status").order("created_at", { ascending: false }).limit(200),
      supabase.from("quotations").select("id, quote_id, guest_name, total_price, status").order("created_at", { ascending: false }).limit(200),
      supabase.from("stays").select("id, name").eq("status", "active"),
      supabase.from("booking_ledger_entries").select("*").order("created_at", { ascending: false }),
    ]);
    setTxns((tRes.data as Txn[]) || []);
    setBookings((bRes.data as BookingRef[]) || []);
    setInvoices((iRes.data as InvoiceRef[]) || []);
    setQuotations((qRes.data as QuotationRef[]) || []);
    setStays((sRes.data as StayRef[]) || []);
    setLedgerEntries((lRes.data as LedgerEntry[]) || []);
    setSetupNeeded(false);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("accounting-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "accounting_transactions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_ledger_entries" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const months = useMemo(() => {
    const set = new Set<string>();
    txns.forEach(t => set.add(t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [txns]);

  const filtered = useMemo(() => {
    let list = txns;
    if (tab !== "all") list = list.filter(t => t.type === tab);
    if (categoryFilter !== "all") list = list.filter(t => t.category === categoryFilter);
    if (monthFilter !== "all") list = list.filter(t => t.date.startsWith(monthFilter));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.reference_number?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }
    list.sort((a, b) => {
      const va = sortKey === "date" ? a.date : a.amount;
      const vb = sortKey === "date" ? b.date : b.amount;
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [txns, tab, categoryFilter, monthFilter, search, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const src = monthFilter !== "all" ? txns.filter(t => t.date.startsWith(monthFilter)) : txns;
    const income = src.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = src.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const commission = src.filter(t => t.type === "commission").reduce((s, t) => s + t.amount, 0);
    return { income, expense, commission, savings: income - expense - commission };
  }, [txns, monthFilter]);

  // Chart data — last 6 months
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      const monthTxns = txns.filter(t => t.date.startsWith(key));
      return {
        month: label,
        income: monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
        commission: monthTxns.filter(t => t.type === "commission").reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [txns]);

  // Pie data — category breakdown for current filter
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name: categoryLabel(name), value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Booking income from bookings table (confirmed)
  const bookingRevenue = useMemo(() =>
    bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.total_price || 0), 0),
  [bookings]);

  // Invoice totals
  const invoiceStats = useMemo(() => {
    const paid = invoices.filter(i => i.payment_status === "paid").reduce((s, i) => s + (i.total_price || 0), 0);
    const pending = invoices.filter(i => i.payment_status === "pending").reduce((s, i) => s + (i.total_price || 0), 0);
    const total = invoices.reduce((s, i) => s + (i.total_price || 0), 0);
    return { paid, pending, total, count: invoices.length, paidCount: invoices.filter(i => i.payment_status === "paid").length };
  }, [invoices]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ type: "income", category: "general", description: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), payment_method: "cash", reference_number: "", notes: "", booking_id: "", invoice_id: "", stay_id: "", tags: "" });
    setEditId(null);
  };

  const openNew = () => {
    resetForm();
    setForm(f => ({ ...f, reference_number: generateRefNumber("income") }));
    setFormOpen(true);
  };

  const openEdit = (t: Txn) => {
    setForm({
      type: t.type, category: t.category, description: t.description,
      amount: String(t.amount), date: t.date,
      payment_method: t.payment_method || "cash",
      reference_number: t.reference_number || "",
      notes: t.notes || "",
      booking_id: t.booking_id || "", invoice_id: t.invoice_id || "",
      stay_id: t.stay_id || "", tags: (t.tags || []).join(", "),
    });
    setEditId(t.id);
    setFormOpen(true);
  };

  const saveTransaction = async () => {
    if (!form.description.trim()) { toast({ title: "Description required", variant: "destructive" }); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast({ title: "Valid amount required", variant: "destructive" }); return; }

    const payload = {
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount: Math.round(Number(form.amount)),
      date: form.date,
      payment_method: form.payment_method,
      reference_number: form.reference_number.trim() || null,
      notes: form.notes.trim() || null,
      booking_id: form.booking_id || null,
      invoice_id: form.invoice_id || null,
      stay_id: form.stay_id || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    if (editId) {
      const { error } = await supabase.from("accounting_transactions")
        .update({ ...payload, updated_at: new Date().toISOString() } as any).eq("id", editId);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Transaction updated" });
    } else {
      const { error } = await supabase.from("accounting_transactions").insert(payload as any);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Transaction added" });
    }
    setFormOpen(false);
    resetForm();
    fetchAll();
  };

  const deleteTxn = async (id: string) => {
    const { error } = await supabase.from("accounting_transactions").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Deleted" });
    setDeleteOpen(false); setDeleteTarget(null); fetchAll();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("accounting_transactions").delete().in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: `${ids.length} entries deleted` });
    setSelectedIds(new Set()); fetchAll();
  };

  // Ledger
  const openLedger = (bookingId: string) => {
    setLedgerBookingId(bookingId);
    setLedgerForm({ label: "", amount: "", type: "income", notes: "" });
    setLedgerOpen(true);
  };

  const saveLedgerEntry = async () => {
    if (!ledgerBookingId || !ledgerForm.label.trim() || !ledgerForm.amount) return;
    const { error } = await supabase.from("booking_ledger_entries").insert({
      booking_id: ledgerBookingId,
      label: ledgerForm.label.trim(),
      amount: Math.round(Number(ledgerForm.amount)),
      type: ledgerForm.type,
      notes: ledgerForm.notes.trim() || null,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Ledger entry added" }); setLedgerForm({ label: "", amount: "", type: "income", notes: "" }); fetchAll(); }
  };

  const deleteLedgerEntry = async (id: string) => {
    await supabase.from("booking_ledger_entries").delete().eq("id", id);
    fetchAll();
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => setSelectedIds(prev =>
    prev.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id))
  );

  const bookingMap = useMemo(() => Object.fromEntries(bookings.map(b => [b.id, b])), [bookings]);
  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map(i => [i.id, i])), [invoices]);
  const stayMap = useMemo(() => Object.fromEntries(stays.map(s => [s.id, s])), [stays]);

  const clearFilters = () => { setSearch(""); setTab("all"); setCategoryFilter("all"); setMonthFilter("all"); };
  const hasFilters = search || tab !== "all" || categoryFilter !== "all" || monthFilter !== "all";

  const toggleSort = (k: "date" | "amount") => {
    if (sortKey === k) setSortAsc(p => !p); else { setSortKey(k); setSortAsc(false); }
  };

  const currentLedger = useMemo(() =>
    ledgerEntries.filter(e => e.booking_id === ledgerBookingId),
  [ledgerEntries, ledgerBookingId]);

  const currentBooking = ledgerBookingId ? bookingMap[ledgerBookingId] : null;

  // ─── Setup migration runner ───────────────────────────────────────────────

  const SETUP_SQL = `-- Accounting Book tables
CREATE TABLE IF NOT EXISTS public.accounting_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'commission')),
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  amount integer NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  stay_id uuid REFERENCES public.stays(id) ON DELETE SET NULL,
  payment_method text DEFAULT 'cash',
  reference_number text DEFAULT '',
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.booking_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  amount integer NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'commission')) DEFAULT 'income',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can manage own accounting_transactions" ON public.accounting_transactions FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1)) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "Tenant can manage own booking_ledger_entries" ON public.booking_ledger_entries FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1)) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1));
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_tenant ON public.accounting_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_date ON public.accounting_transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_type ON public.accounting_transactions(type);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_booking ON public.accounting_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_ledger_entries_booking ON public.booking_ledger_entries(booking_id);`;

  const [copied, setCopied] = useState(false);

  const copySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (setupNeeded) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Setup Accounting Book</h2>
              <p className="text-sm text-muted-foreground">
                The accounting tables need to be created in your Supabase database.
                Copy the SQL below and run it in your{" "}
                <a
                  href={`https://supabase.com/dashboard/project/rxaadodnkuiywjvkoqrp/sql`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  Supabase SQL Editor
                </a>.
              </p>
              <div className="relative">
                <pre className="text-left text-[10px] bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-all border">
                  {SETUP_SQL}
                </pre>
                <Button size="sm" className="absolute top-2 right-2 h-7 text-xs" onClick={copySQL}>
                  {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy SQL</>}
                </Button>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" size="sm" onClick={fetchAll}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> I've run it — Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Accounting Book
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {txns.length} entries · Booking revenue: {formatCurrency(bookingRevenue)} · Invoice paid: {formatCurrency(invoiceStats.paid)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportCSV(filtered)}>
            <Download className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={openNew}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total Income", value: stats.income, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Total Expenses", value: stats.expense, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Commission", value: stats.commission, icon: Percent, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Net Savings", value: stats.savings, icon: PiggyBank, color: stats.savings >= 0 ? "text-emerald-600" : "text-red-600", bg: stats.savings >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`${s.bg} border-0`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className={`font-bold text-lg sm:text-xl tabular-nums ${s.color}`}>{formatCurrency(s.value)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Invoice Stats */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: "Invoice Total", value: invoiceStats.total, sub: `${invoiceStats.count} invoices`, icon: Receipt, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
            { label: "Invoice Paid", value: invoiceStats.paid, sub: `${invoiceStats.paidCount} paid`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
            { label: "Invoice Pending", value: invoiceStats.pending, sub: `${invoiceStats.count - invoiceStats.paidCount} pending`, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
            { label: "Collection Rate", value: invoiceStats.total > 0 ? Math.round((invoiceStats.paid / invoiceStats.total) * 100) : 0, isSuffix: true, suffix: "%", icon: BarChart3, color: invoiceStats.total > 0 && invoiceStats.paid / invoiceStats.total >= 0.5 ? "text-green-600" : "text-amber-600", bg: invoiceStats.total > 0 && invoiceStats.paid / invoiceStats.total >= 0.5 ? "bg-green-50 dark:bg-green-950/30" : "bg-amber-50 dark:bg-amber-950/30" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`${s.bg} border-0`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className={`font-bold text-lg sm:text-xl tabular-nums ${s.color}`}>
                    {"isSuffix" in s && s.isSuffix ? `${s.value}${s.suffix}` : formatCurrency(s.value as number)}
                  </p>
                  {"sub" in s && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-semibold">Financial Overview</CardTitle>
              <div className="flex gap-1">
                {(["area", "bar", "pie"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                      chartView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v === "area" ? "Trend" : v === "bar" ? "Compare" : "Split"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-1 sm:px-4 pb-3">
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === "area" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                      <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#gi)" strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#ge)" strokeWidth={2} name="Expense" />
                    <Area type="monotone" dataKey="commission" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Commission" />
                  </AreaChart>
                ) : chartView === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                    <Bar dataKey="commission" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Commission" />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" innerRadius="40%" paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs + Filters */}
      <div className="space-y-2">
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={tab} onValueChange={v => { setTab(v as TabFilter); setSelectedIds(new Set()); }}>
            <TabsList className="h-8 sm:h-9 w-max sm:w-auto">
              <TabsTrigger value="all" className="text-[11px] sm:text-xs px-2.5">All ({txns.length})</TabsTrigger>
              <TabsTrigger value="income" className="text-[11px] sm:text-xs px-2.5">
                <ArrowUpRight className="w-3 h-3 mr-1 text-green-600" /> Income
              </TabsTrigger>
              <TabsTrigger value="expense" className="text-[11px] sm:text-xs px-2.5">
                <ArrowDownRight className="w-3 h-3 mr-1 text-red-600" /> Expense
              </TabsTrigger>
              <TabsTrigger value="commission" className="text-[11px] sm:text-xs px-2.5">
                <Percent className="w-3 h-3 mr-1 text-blue-600" /> Commission
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search description, category, ref..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs sm:text-sm" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><XCircle className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-32 h-9 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {months.map(m => <SelectItem key={m} value={m}>{format(parseISO(`${m}-01`), "MMM yyyy")}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground h-8 shrink-0">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={bulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort + Select All */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button className="shrink-0" onClick={toggleSelectAll}>
            <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} />
          </button>
          <span className="text-xs text-muted-foreground">
            {selectedIds.size === filtered.length ? "Deselect all" : `Select all ${filtered.length}`}
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {(["date", "amount"] as const).map(k => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className={cn("flex items-center gap-0.5 px-2 py-1 rounded-md transition-colors", sortKey === k ? "bg-muted font-semibold text-foreground" : "hover:bg-muted/60")}
              >
                {k === "date" ? "Date" : "Amount"}
                {sortKey === k && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions found</p>
            {hasFilters && <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>}
            <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" /> Add first entry</Button>
          </div>
        ) : filtered.map((t, i) => {
          const conf = TYPE_CONFIG[t.type];
          const bk = t.booking_id ? bookingMap[t.booking_id] : null;
          const inv = t.invoice_id ? invoiceMap[t.invoice_id] : null;
          const stay = t.stay_id ? stayMap[t.stay_id] : null;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.015 }}
              className={cn("rounded-xl border bg-card hover:shadow-md transition-shadow", selectedIds.has(t.id) && "ring-2 ring-primary")}
            >
              {/* Header */}
              <div className="p-3 pb-2 flex items-start gap-2">
                <button className="mt-0.5 shrink-0" onClick={() => toggleSelect(t.id)}>
                  <Checkbox checked={selectedIds.has(t.id)} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{t.description || categoryLabel(t.category)}</p>
                    <span className={cn("font-bold text-sm tabular-nums shrink-0", conf.color)}>
                      {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-[8px] py-0 px-1.5", conf.bg, conf.color)}>
                      <conf.icon className="w-2.5 h-2.5 mr-0.5" />{conf.label}
                    </Badge>
                    <Badge variant="outline" className="text-[8px] py-0 px-1.5">{categoryLabel(t.category)}</Badge>
                    {t.payment_method && t.payment_method !== "cash" && (
                      <Badge variant="outline" className="text-[8px] py-0 px-1.5">{t.payment_method.toUpperCase()}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="px-3 pb-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarIcon className="w-3 h-3 shrink-0" />
                  <span className="font-medium">{format(parseISO(t.date), "dd MMM yyyy")}</span>
                  {t.reference_number && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-[10px] truncate">Ref: {t.reference_number}</span>
                    </>
                  )}
                </div>
                {/* Linked entities */}
                <div className="flex items-center gap-1 flex-wrap">
                  {bk && (
                    <button onClick={() => openLedger(bk.id)} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                      📋 {bk.booking_id} — {bk.guest_name}
                    </button>
                  )}
                  {inv && (
                    <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30">
                      <Receipt className="w-2.5 h-2.5 mr-0.5" /> {inv.invoice_id}
                    </Badge>
                  )}
                  {stay && (
                    <Badge variant="outline" className="text-[8px] py-0 px-1.5">{stay.name}</Badge>
                  )}
                </div>
                {t.notes && <p className="text-[10px] text-muted-foreground line-clamp-2">{t.notes}</p>}
                {t.tags && t.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {t.tags.map(tag => <span key={tag} className="text-[8px] px-1 py-0 rounded-full bg-muted text-muted-foreground">#{tag}</span>)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t bg-muted/20 px-2.5 py-1.5 flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] flex-1" onClick={() => openEdit(t)}>
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                {bk && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] flex-1" onClick={() => openLedger(bk.id)}>
                    <BookOpen className="w-3 h-3 mr-1" /> Ledger
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 px-2 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all shrink-0">
                      <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const copy = { ...form, type: t.type, category: t.category, description: t.description, amount: String(t.amount), payment_method: t.payment_method || "cash" };
                      setForm(copy); setEditId(null); setFormOpen(true);
                    }}><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteTarget(t.id); setDeleteOpen(true); }}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground">
            Showing {filtered.length} of {txns.length} entries
          </p>
          <p className="text-xs font-medium">
            <span className="text-green-600">+{formatCurrency(filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0))}</span>
            {" · "}
            <span className="text-red-600">-{formatCurrency(filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0))}</span>
            {" · "}
            <span className="text-blue-600">{formatCurrency(filtered.filter(t => t.type === "commission").reduce((s, t) => s + t.amount, 0))} comm.</span>
          </p>
        </div>
      )}

      {/* ─── Booking Ledger Section ──────────────────────────────────────── */}
      {bookings.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Per-Booking Ledger
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Add custom income, expense, or commission entries per booking</p>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {bookings.slice(0, 12).map(bk => {
                  const entries = ledgerEntries.filter(e => e.booking_id === bk.id);
                  const ledgerIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
                  const ledgerExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
                  return (
                    <button
                      key={bk.id}
                      onClick={() => openLedger(bk.id)}
                      className="text-left p-2.5 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold truncate">{bk.guest_name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">{bk.booking_id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-foreground">₹{(bk.total_price || 0).toLocaleString("en-IN")}</span>
                        <Badge variant={bk.status === "confirmed" ? "default" : bk.status === "cancelled" ? "destructive" : "secondary"} className="text-[8px] py-0 px-1">{bk.status}</Badge>
                        {entries.length > 0 && <span className="text-[9px] text-muted-foreground ml-auto">{entries.length} entries</span>}
                      </div>
                      {entries.length > 0 && (
                        <div className="flex gap-2 mt-1">
                          {ledgerIncome > 0 && <span className="text-[9px] text-green-600">+₹{ledgerIncome.toLocaleString("en-IN")}</span>}
                          {ledgerExpense > 0 && <span className="text-[9px] text-red-600">-₹{ledgerExpense.toLocaleString("en-IN")}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Invoice & Quotation Quick View ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Invoices */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-500" /> Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 space-y-1.5">
              {invoices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No invoices yet</p>
              ) : invoices.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{inv.guest_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{inv.invoice_id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums">{formatCurrency(inv.total_price)}</p>
                    <Badge variant={inv.payment_status === "paid" ? "default" : inv.payment_status === "cancelled" ? "destructive" : "secondary"} className="text-[8px] py-0 px-1">{inv.payment_status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quotations */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-500" /> Recent Quotations
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 space-y-1.5">
              {quotations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No quotations yet</p>
              ) : quotations.slice(0, 5).map(q => (
                <div key={q.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{q.guest_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{q.quote_id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums">{formatCurrency(q.total_price)}</p>
                    <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"} className="text-[8px] py-0 px-1">{q.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Add/Edit Transaction Dialog ─────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              {(["income", "expense", "commission"] as const).map(t => {
                const c = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t, reference_number: !editId ? generateRefNumber(t) : f.reference_number }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all border",
                      form.type === t ? `${c.bg} ${c.color} border-current` : "border-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <c.icon className="w-3.5 h-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Amount *</label>
                <Input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Date *</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Description *</label>
              <Input placeholder="What is this for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Payment Method</label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Reference Number</label>
              <Input placeholder="Invoice #, receipt #, etc." value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} className="h-9 text-sm" />
            </div>

            {/* Link to booking / invoice / stay */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Booking</label>
                <Select value={form.booking_id || "none"} onValueChange={v => setForm(f => ({ ...f, booking_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {bookings.slice(0, 50).map(b => <SelectItem key={b.id} value={b.id}>{b.booking_id} — {b.guest_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Invoice</label>
                <Select value={form.invoice_id || "none"} onValueChange={v => setForm(f => ({ ...f, invoice_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {invoices.slice(0, 50).map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Stay</label>
                <Select value={form.stay_id || "none"} onValueChange={v => setForm(f => ({ ...f, stay_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {stays.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Notes</label>
              <Textarea placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Tags (comma separated)</label>
              <Input placeholder="rent, q1, marketing" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button size="sm" onClick={saveTransaction}>{editId ? "Update" : "Add"} Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Booking Ledger Dialog ───────────────────────────────────────── */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Booking Ledger
            </DialogTitle>
            {currentBooking && (
              <p className="text-xs text-muted-foreground">
                {currentBooking.booking_id} — {currentBooking.guest_name} · ₹{(currentBooking.total_price || 0).toLocaleString("en-IN")}
              </p>
            )}
          </DialogHeader>

          {/* Existing entries */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {currentLedger.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No custom entries yet</p>
            ) : currentLedger.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{e.label}</p>
                  {e.notes && <p className="text-[10px] text-muted-foreground truncate">{e.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs font-bold tabular-nums", TYPE_CONFIG[e.type].color)}>
                    {e.type === "expense" ? "-" : "+"}{formatCurrency(e.amount)}
                  </span>
                  <button onClick={() => deleteLedgerEntry(e.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new entry */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">Add Entry</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["income", "expense", "commission"] as const).map(t => {
                const c = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setLedgerForm(f => ({ ...f, type: t }))}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-semibold transition-all",
                      ledgerForm.type === t ? `${c.bg} ${c.color}` : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Label" value={ledgerForm.label} onChange={e => setLedgerForm(f => ({ ...f, label: e.target.value }))} className="h-8 text-xs" />
              <Input type="number" placeholder="Amount" value={ledgerForm.amount} onChange={e => setLedgerForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-xs" />
            </div>
            <Input placeholder="Notes (optional)" value={ledgerForm.notes} onChange={e => setLedgerForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-xs" />
            <Button size="sm" className="w-full h-8 text-xs" onClick={saveLedgerEntry} disabled={!ledgerForm.label.trim() || !ledgerForm.amount}>
              <Plus className="w-3 h-3 mr-1" /> Add Ledger Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteTxn(deleteTarget)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
