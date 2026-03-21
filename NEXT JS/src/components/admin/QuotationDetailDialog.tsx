import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props {
  quotation: any;
  stayName: string;
  onClose: () => void;
}

export function QuotationDetailDialog({ quotation: q, stayName, onClose }: Props) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {q.quote_id} <Badge variant="secondary">{q.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-muted-foreground text-xs">Guest</p><p className="font-medium">{q.guest_name}</p></div>
            <div><p className="text-muted-foreground text-xs">Phone</p><p>{q.phone || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Stay</p><p>{stayName}</p></div>
            <div><p className="text-muted-foreground text-xs">Email</p><p>{q.email || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Check-in</p><p>{q.checkin ? format(new Date(q.checkin), "dd MMM yyyy") : "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Check-out</p><p>{q.checkout ? format(new Date(q.checkout), "dd MMM yyyy") : "—"}</p></div>
          </div>

          {(q.rooms as any[])?.length > 0 && (
            <div>
              <p className="font-semibold text-xs text-muted-foreground mb-1">Rooms</p>
              {(q.rooms as any[]).map((r: any, i: number) => (
                <p key={i}>• {r.name} × {r.qty} — ₹{(r.price * r.qty).toLocaleString("en-IN")}</p>
              ))}
            </div>
          )}

          {(q.addons as any[])?.length > 0 && (
            <div>
              <p className="font-semibold text-xs text-muted-foreground mb-1">Add-ons</p>
              {(q.addons as any[]).map((a: any, i: number) => (
                <p key={i}>• {a.name} — ₹{a.price?.toLocaleString("en-IN")}</p>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between"><span>Room Total</span><span>₹{q.room_total?.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Add-ons</span><span>₹{q.addons_total?.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Discount</span><span className="text-destructive">-₹{q.discount?.toLocaleString("en-IN")}</span></div>
            <div className="border-t pt-1 flex justify-between font-bold">
              <span>Total</span><span>₹{q.total_price?.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {q.special_requests && (
            <div>
              <p className="text-muted-foreground text-xs">Special Requests</p>
              <p className="italic">{q.special_requests}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Created: {format(new Date(q.created_at), "dd MMM yyyy, hh:mm a")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
