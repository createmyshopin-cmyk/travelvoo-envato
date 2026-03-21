import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const paymentColors: Record<string, string> = {
  pending: "secondary",
  paid: "default",
  partially_paid: "outline",
  cancelled: "destructive",
};

interface Props {
  invoice: any;
  stayName: string;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}

export function InvoiceDetailDialog({ invoice: inv, stayName, onClose, onStatusChange }: Props) {
  const [notes, setNotes] = useState(inv.payment_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const saveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from("invoices").update({ payment_notes: notes, updated_at: new Date().toISOString() } as any).eq("id", inv.id);
    setSavingNotes(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Notes saved" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {inv.invoice_id}
            <Badge variant={paymentColors[inv.payment_status] as any || "secondary"}>
              {inv.payment_status?.replace("_", " ")}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-muted-foreground text-xs">Guest</p><p className="font-medium">{inv.guest_name}</p></div>
            <div><p className="text-muted-foreground text-xs">Phone</p><p>{inv.phone || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Stay</p><p>{stayName}</p></div>
            <div><p className="text-muted-foreground text-xs">Email</p><p>{inv.email || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Check-in</p><p>{inv.checkin ? format(new Date(inv.checkin), "dd MMM yyyy") : "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Check-out</p><p>{inv.checkout ? format(new Date(inv.checkout), "dd MMM yyyy") : "—"}</p></div>
          </div>

          {(inv.rooms as any[])?.length > 0 && (
            <div>
              <p className="font-semibold text-xs text-muted-foreground mb-1">Rooms</p>
              {(inv.rooms as any[]).map((r: any, i: number) => (
                <p key={i}>• {r.name} × {r.qty} — ₹{(r.price * r.qty).toLocaleString("en-IN")}</p>
              ))}
            </div>
          )}

          {(inv.addons as any[])?.length > 0 && (
            <div>
              <p className="font-semibold text-xs text-muted-foreground mb-1">Add-ons</p>
              {(inv.addons as any[]).map((a: any, i: number) => (
                <p key={i}>• {a.name} — ₹{a.price?.toLocaleString("en-IN")}</p>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between"><span>Room Total</span><span>₹{inv.room_total?.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Add-ons</span><span>₹{inv.addons_total?.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Discount</span><span className="text-destructive">-₹{inv.discount?.toLocaleString("en-IN")}</span></div>
            {inv.coupon_code && <div className="flex justify-between"><span>Coupon</span><span>{inv.coupon_code}</span></div>}
            <div className="border-t pt-1 flex justify-between font-bold">
              <span>Total</span><span>₹{inv.total_price?.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={inv.payment_status} onValueChange={onStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Advance paid ₹3000 via UPI" />
            <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">Created: {format(new Date(inv.created_at), "dd MMM yyyy, hh:mm a")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
