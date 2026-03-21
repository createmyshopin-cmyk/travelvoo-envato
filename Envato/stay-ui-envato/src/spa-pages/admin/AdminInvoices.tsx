import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Eye, Download, MessageCircle, Search, RefreshCw, Receipt, CheckCircle2, Zap } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";
import { InvoiceDetailDialog } from "@/components/admin/InvoiceDetailDialog";
import { generateInvoicePdf } from "@/lib/pdfUtils";
import { format } from "date-fns";

const paymentColors: Record<string, string> = {
  pending: "secondary",
  paid: "default",
  partially_paid: "outline",
  cancelled: "destructive",
};

export default function AdminInvoices() {
  const { settings: siteSettings } = useSiteSettings();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [savingToggle, setSavingToggle] = useState(false);

  const autoGenerate = siteSettings?.auto_generate_invoice ?? false;

  const setAutoGenerate = async (checked: boolean) => {
    if (!siteSettings?.id) return;
    setSavingToggle(true);
    const { error } = await supabase.from("site_settings").update({ auto_generate_invoice: checked, updated_at: new Date().toISOString() } as any).eq("id", siteSettings.id);
    setSavingToggle(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { clearSiteSettingsCache(); toast({ title: checked ? "Auto-generate enabled" : "Auto-generate disabled" }); }
  };

  const fetchData = async () => {
    const [iRes, sRes] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name, stay_id").eq("status", "active"),
    ]);
    setInvoices((iRes.data as any[]) || []);
    setStays((sRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updatePaymentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("invoices").update({ payment_status: status, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Status updated" }); fetchData(); }
  };

  const sendWhatsApp = (inv: any) => {
    const stay = stays.find((s) => s.id === inv.stay_id);
    const msg = `Hello ${inv.guest_name},\n\nHere is your invoice.\n\n*Invoice:* ${inv.invoice_id}\n*Stay:* ${stay?.name || "—"}\n\n*Check-in:* ${inv.checkin ? format(new Date(inv.checkin), "dd MMM yyyy") : "—"}\n*Check-out:* ${inv.checkout ? format(new Date(inv.checkout), "dd MMM yyyy") : "—"}\n\n*Total:* ₹${inv.total_price?.toLocaleString("en-IN")}\n*Status:* ${inv.payment_status}\n\nThank you!`;
    window.open(`https://wa.me/${inv.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const getStayName = (stayId: string) => stays.find((s) => s.id === stayId)?.name || "—";

  const filtered = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return !term || inv.invoice_id?.toLowerCase().includes(term) || inv.guest_name?.toLowerCase().includes(term) || inv.phone?.includes(term);
  });

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" /> Invoices
        </h2>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <Zap className="w-4 h-4 text-primary" />
          <div>
            <Label htmlFor="auto-invoice" className="text-sm font-medium cursor-pointer">Auto-generate invoice on new booking</Label>
            <p className="text-xs text-muted-foreground">Creates an invoice when a guest submits a booking</p>
          </div>
          <Switch id="auto-invoice" checked={autoGenerate} onCheckedChange={setAutoGenerate} disabled={savingToggle} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by ID, name, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : filtered.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.invoice_id}</TableCell>
                <TableCell className="font-medium">{inv.guest_name}</TableCell>
                <TableCell className="text-sm">{getStayName(inv.stay_id)}</TableCell>
                <TableCell className="text-sm">{inv.checkin ? format(new Date(inv.checkin), "dd MMM") : "—"}</TableCell>
                <TableCell className="font-semibold">₹{inv.total_price?.toLocaleString("en-IN")}</TableCell>
                <TableCell>
                  <Select value={inv.payment_status} onValueChange={(v) => updatePaymentStatus(inv.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generateInvoicePdf(inv, getStayName(inv.stay_id))}><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => sendWhatsApp(inv)}><MessageCircle className="h-4 w-4" /></Button>
                    {inv.payment_status !== "paid" && (
                      <Button variant="ghost" size="icon" onClick={() => updatePaymentStatus(inv.id, "paid")} title="Mark Paid">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No invoices found</p>
        ) : filtered.map((inv) => (
          <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{inv.guest_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{inv.invoice_id}</p>
              </div>
              <Badge variant={paymentColors[inv.payment_status] as any || "secondary"}>{inv.payment_status?.replace("_", " ")}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{getStayName(inv.stay_id)}</p>
                <p className="text-sm font-semibold">₹{inv.total_price?.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateInvoicePdf(inv, getStayName(inv.stay_id))}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendWhatsApp(inv)}><MessageCircle className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewInvoice && <InvoiceDetailDialog invoice={viewInvoice} stayName={getStayName(viewInvoice.stay_id)} onClose={() => setViewInvoice(null)} onStatusChange={(s) => { updatePaymentStatus(viewInvoice.id, s); setViewInvoice({ ...viewInvoice, payment_status: s }); }} />}
    </div>
  );
}
