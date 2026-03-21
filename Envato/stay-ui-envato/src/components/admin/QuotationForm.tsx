import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: any;
  stays: any[];
  onSaved: () => void;
}

interface RoomLine { name: string; qty: number; price: number; }
interface AddonLine { name: string; price: number; }

export function QuotationForm({ open, onOpenChange, quotation, stays, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [stayId, setStayId] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [rooms, setRooms] = useState<RoomLine[]>([{ name: "", qty: 1, price: 0 }]);
  const [addons, setAddons] = useState<AddonLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (quotation) {
      setGuestName(quotation.guest_name || "");
      setPhone(quotation.phone || "");
      setEmail(quotation.email || "");
      setStayId(quotation.stay_id || "");
      setCheckin(quotation.checkin || "");
      setCheckout(quotation.checkout || "");
      setRooms((quotation.rooms as RoomLine[]) || [{ name: "", qty: 1, price: 0 }]);
      setAddons((quotation.addons as AddonLine[]) || []);
      setDiscount(quotation.discount || 0);
      setCouponCode(quotation.coupon_code || "");
      setSpecialRequests(quotation.special_requests || "");
      setStatus(quotation.status || "draft");
    } else {
      setGuestName(""); setPhone(""); setEmail(""); setStayId(""); setCheckin(""); setCheckout("");
      setRooms([{ name: "", qty: 1, price: 0 }]); setAddons([]); setDiscount(0); setCouponCode("");
      setSpecialRequests(""); setStatus("draft");
    }
  }, [quotation, open]);

  const roomTotal = useMemo(() => rooms.reduce((s, r) => s + r.price * r.qty, 0), [rooms]);
  const addonsTotal = useMemo(() => addons.reduce((s, a) => s + a.price, 0), [addons]);
  const totalPrice = roomTotal + addonsTotal - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoading(true);

    const payload: any = {
      guest_name: guestName, phone, email, stay_id: stayId || null,
      rooms, addons, checkin: checkin || null, checkout: checkout || null,
      discount, coupon_code: couponCode || null, special_requests: specialRequests || null,
      room_total: roomTotal, addons_total: addonsTotal, total_price: totalPrice,
      status, updated_at: new Date().toISOString(),
    };

    let error;
    if (quotation) {
      ({ error } = await supabase.from("quotations").update(payload).eq("id", quotation.id));
    } else {
      payload.quote_id = `Q-${Math.floor(1000 + Math.random() * 9000)}`;
      ({ error } = await supabase.from("quotations").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: quotation ? "Quotation updated" : "Quotation created" });
      onSaved();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const updateRoom = (i: number, field: keyof RoomLine, value: any) => {
    const updated = [...rooms];
    (updated[i] as any)[field] = value;
    setRooms(updated);
  };

  const updateAddon = (i: number, field: keyof AddonLine, value: any) => {
    const updated = [...addons];
    (updated[i] as any)[field] = value;
    setAddons(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quotation ? "Edit Quotation" : "New Quotation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Guest Name *</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Stay</Label>
              <Select value={stayId} onValueChange={setStayId}>
                <SelectTrigger><SelectValue placeholder="Select stay" /></SelectTrigger>
                <SelectContent>
                  {stays.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Check-in</Label>
              <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Check-out</Label>
              <Input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
            </div>
          </div>

          {/* Rooms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Rooms</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRooms([...rooms, { name: "", qty: 1, price: 0 }])}>
                <Plus className="w-3 h-3 mr-1" /> Add Room
              </Button>
            </div>
            {rooms.map((r, i) => (
              <div key={i} className="flex gap-2 items-end">
                <Input placeholder="Room name" value={r.name} onChange={(e) => updateRoom(i, "name", e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Qty" value={r.qty} onChange={(e) => updateRoom(i, "qty", Number(e.target.value))} className="w-16" />
                <Input type="number" placeholder="Price" value={r.price} onChange={(e) => updateRoom(i, "price", Number(e.target.value))} className="w-24" />
                {rooms.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add-ons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Add-ons</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddons([...addons, { name: "", price: 0 }])}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {addons.map((a, i) => (
              <div key={i} className="flex gap-2 items-end">
                <Input placeholder="Add-on name" value={a.name} onChange={(e) => updateAddon(i, "name", e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Price" value={a.price} onChange={(e) => updateAddon(i, "price", Number(e.target.value))} className="w-24" />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setAddons(addons.filter((_, j) => j !== i))}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Discount (₹)</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Coupon Code</Label>
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Special Requests</Label>
            <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} rows={2} />
          </div>

          {/* Price Summary */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Room Total</span><span>₹{roomTotal.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Add-ons</span><span>₹{addonsTotal.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>Discount</span><span className="text-destructive">-₹{discount.toLocaleString("en-IN")}</span></div>
            <div className="border-t pt-1 flex justify-between font-bold">
              <span>Total</span><span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? "Saving..." : quotation ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
