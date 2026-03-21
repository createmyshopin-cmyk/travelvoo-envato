import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Eye, Pencil, Trash2, Download, MessageCircle, FileText, Search, RefreshCw } from "lucide-react";
import { QuotationForm } from "@/components/admin/QuotationForm";
import { QuotationDetailDialog } from "@/components/admin/QuotationDetailDialog";
import { generateQuotationPdf } from "@/lib/pdfUtils";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  draft: "secondary",
  sent: "default",
  accepted: "default",
  rejected: "destructive",
  converted: "outline",
};

export default function AdminQuotations() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<any>(null);
  const [viewQuote, setViewQuote] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    const [qRes, sRes] = await Promise.all([
      supabase.from("quotations").select("*").order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name, stay_id").eq("status", "active"),
    ]);
    setQuotations((qRes.data as any[]) || []);
    setStays((sRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("quotations").delete().eq("id", deleteId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Quotation deleted" }); fetchData(); }
    setDeleteId(null);
  };

  const sendWhatsApp = (q: any) => {
    const stay = stays.find((s) => s.id === q.stay_id);
    const msg = `Hello ${q.guest_name},\n\nHere is your stay quotation.\n\n*Quotation:* ${q.quote_id}\n*Stay:* ${stay?.name || "—"}\n*Stay ID:* ${stay?.stay_id || "—"}\n\n*Check-in:* ${q.checkin ? format(new Date(q.checkin), "dd MMM yyyy") : "—"}\n*Check-out:* ${q.checkout ? format(new Date(q.checkout), "dd MMM yyyy") : "—"}\n\n*Total Quote:* ₹${q.total_price?.toLocaleString("en-IN")}\n\nThank you!`;
    window.open(`https://wa.me/${q.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const convertToInvoice = async (q: any) => {
    const invoiceId = `INV-${Math.floor(2000 + Math.random() * 8000)}`;
    const { error } = await supabase.from("invoices").insert({
      invoice_id: invoiceId,
      quotation_id: q.id,
      guest_name: q.guest_name,
      phone: q.phone,
      email: q.email,
      stay_id: q.stay_id,
      rooms: q.rooms,
      addons: q.addons,
      checkin: q.checkin,
      checkout: q.checkout,
      room_total: q.room_total,
      addons_total: q.addons_total,
      discount: q.discount,
      coupon_code: q.coupon_code,
      total_price: q.total_price,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("quotations").update({ status: "converted" } as any).eq("id", q.id);
      toast({ title: "Invoice Created", description: `${invoiceId} created from ${q.quote_id}` });
      fetchData();
    }
  };

  const filtered = quotations.filter((q) => {
    const term = searchTerm.toLowerCase();
    return !term || q.quote_id?.toLowerCase().includes(term) || q.guest_name?.toLowerCase().includes(term) || q.phone?.includes(term);
  });

  const getStayName = (stayId: string) => stays.find((s) => s.id === stayId)?.name || "—";

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Quotations
        </h2>
        <Button size="sm" onClick={() => { setEditQuote(null); setFormOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New Quotation
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by ID, name, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote ID</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No quotations found</TableCell></TableRow>
            ) : filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-mono text-xs">{q.quote_id}</TableCell>
                <TableCell className="font-medium">{q.guest_name}</TableCell>
                <TableCell className="text-sm">{q.phone}</TableCell>
                <TableCell className="text-sm">{getStayName(q.stay_id)}</TableCell>
                <TableCell className="text-sm">{q.checkin ? format(new Date(q.checkin), "dd MMM") : "—"}</TableCell>
                <TableCell className="font-semibold">₹{q.total_price?.toLocaleString("en-IN")}</TableCell>
                <TableCell><Badge variant={statusColors[q.status] as any || "secondary"}>{q.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewQuote(q)} title="View"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditQuote(q); setFormOpen(true); }} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generateQuotationPdf(q, getStayName(q.stay_id))} title="Download PDF"><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => sendWhatsApp(q)} title="Send WhatsApp"><MessageCircle className="h-4 w-4" /></Button>
                    {q.status !== "converted" && (
                      <Button variant="ghost" size="icon" onClick={() => convertToInvoice(q)} title="Convert to Invoice"><FileText className="h-4 w-4 text-primary" /></Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <p className="text-center py-8 text-muted-foreground">No quotations found</p>
        ) : filtered.map((q) => (
          <div key={q.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{q.guest_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{q.quote_id}</p>
              </div>
              <Badge variant={statusColors[q.status] as any || "secondary"}>{q.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{getStayName(q.stay_id)}</p>
                <p className="text-sm font-semibold">₹{q.total_price?.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewQuote(q)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateQuotationPdf(q, getStayName(q.stay_id))}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendWhatsApp(q)}><MessageCircle className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <QuotationForm open={formOpen} onOpenChange={setFormOpen} quotation={editQuote} stays={stays} onSaved={fetchData} />
      {viewQuote && <QuotationDetailDialog quotation={viewQuote} stayName={getStayName(viewQuote.stay_id)} onClose={() => setViewQuote(null)} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
