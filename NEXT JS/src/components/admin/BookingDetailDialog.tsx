import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Baby, PawPrint, UserCheck, UsersRound, Copy, Check,
  MessageCircle, Phone, FileText, Receipt, CalendarDays,
  Clock, CheckCircle2, X as XIcon, Tag, IndianRupee,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPhoneForWhatsApp } from "@/lib/countryCodes";

interface BookingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  stayInfo?: { name: string; stay_id: string } | null;
  onStatusChange?: (status: string) => void;
  onCreateQuotation?: () => void;
  onCreateInvoice?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock, color: "text-yellow-600" },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle2, color: "text-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XIcon, color: "text-red-500" },
};

function formatDate(d: string | null): string {
  if (!d) return "N/A";
  return format(parseISO(d), "EEE, dd MMM yyyy");
}

function whatsappUrl(phone: string, guestName: string, bookingId: string, countryCode?: string) {
  const num = formatPhoneForWhatsApp(phone || "", countryCode);
  const text = encodeURIComponent(`Hi ${guestName}, regarding your booking ${bookingId} — `);
  return `https://wa.me/${num}?text=${text}`;
}

export function BookingDetailDialog({ open, onOpenChange, booking, stayInfo, onStatusChange, onCreateQuotation, onCreateInvoice }: BookingDetailDialogProps) {
  const [copiedId, setCopiedId] = useState(false);

  if (!booking) return null;

  const addons = Array.isArray(booking.addons) ? booking.addons : [];
  const rooms = Array.isArray(booking.rooms) ? booking.rooms : [];
  const nights = booking.checkin && booking.checkout
    ? Math.max(0, differenceInDays(parseISO(booking.checkout), parseISO(booking.checkin)))
    : 0;
  const roomTotal = rooms.reduce((s: number, r: any) => s + (r.price || 0) * (r.count || 1), 0);
  const addonsTotal = addons.reduce((s: number, a: any) => s + (a.price || 0), 0);
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  const copyId = () => {
    navigator.clipboard.writeText(booking.booking_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              Booking Details
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">

          {/* Booking ID + Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Booking ID</p>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-sm">{booking.booking_id}</span>
                <button onClick={copyId} className="text-muted-foreground hover:text-primary transition-colors">
                  {copiedId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {onStatusChange ? (
              <Select value={booking.status} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[130px] h-8">
                  <Badge variant={statusConf.variant} className="text-xs gap-1">
                    <statusConf.icon className="w-3 h-3" />
                    {statusConf.label}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-yellow-600" /> Pending</div>
                  </SelectItem>
                  <SelectItem value="confirmed">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Confirmed</div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2"><XIcon className="w-3.5 h-3.5 text-red-500" /> Cancelled</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={statusConf.variant} className="gap-1">
                <statusConf.icon className="w-3 h-3" />
                {statusConf.label}
              </Badge>
            )}
          </div>

          {/* Stay */}
          {stayInfo && (
            <div className="space-y-1">
              <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Stay</p>
              <p className="font-medium">{stayInfo.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{stayInfo.stay_id}</p>
            </div>
          )}

          {/* Guest Details + Contact */}
          <div className="space-y-2">
            <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Guest</p>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium">{booking.guest_name}</p>
                <p className="text-sm text-muted-foreground">{booking.phone}</p>
                {booking.email && <p className="text-sm text-muted-foreground">{booking.email}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                  <a href={whatsappUrl(booking.phone, booking.guest_name, booking.booking_id, booking.phone_country_code)} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                  <a href={`tel:${booking.phone}`} title="Call">
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Travel Info */}
          <div className="space-y-2">
            <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Travel Info</p>
            <div className="flex flex-wrap gap-2">
              {booking.solo_traveller ? (
                <Badge variant="outline" className="gap-1"><UserCheck className="w-3 h-3" /> Solo</Badge>
              ) : (
                <>
                  <Badge variant="outline" className="gap-1"><Users className="w-3 h-3" /> {booking.adults || 2} Adults</Badge>
                  {booking.children > 0 && <Badge variant="outline" className="gap-1"><Baby className="w-3 h-3" /> {booking.children} Children</Badge>}
                  {booking.pets > 0 && <Badge variant="outline" className="gap-1"><PawPrint className="w-3 h-3" /> {booking.pets} Pets</Badge>}
                </>
              )}
              {booking.group_booking && (
                <Badge variant="outline" className="gap-1"><UsersRound className="w-3 h-3" /> Group{booking.group_name ? `: ${booking.group_name}` : ""}</Badge>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Dates</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Check-in</p>
                <p className="text-sm font-bold mt-0.5">{formatDate(booking.checkin)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Check-out</p>
                <p className="text-sm font-bold mt-0.5">{formatDate(booking.checkout)}</p>
              </div>
            </div>
            {nights > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{nights} night{nights !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Rooms */}
          {rooms.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Rooms</p>
              <div className="space-y-1.5">
                {rooms.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{r.name} <span className="text-muted-foreground">× {r.count}</span></span>
                    <span className="font-medium">₹{((r.price || 0) * (r.count || 1)).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {addons.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Add-ons</p>
              <div className="space-y-1.5">
                {addons.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{a.label}</span>
                    <span className="font-medium">₹{(a.price || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="space-y-2 p-3 rounded-xl bg-muted/50 border">
            <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Pricing</p>
            {rooms.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room Total</span>
                <span>₹{roomTotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            {addonsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add-ons</span>
                <span>₹{addonsTotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            {booking.coupon_code && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Coupon
                </span>
                <Badge variant="outline" className="text-green-600 border-green-200 text-[10px]">{booking.coupon_code}</Badge>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold text-sm">Grand Total</span>
              <span className="font-bold text-lg text-primary flex items-center gap-0.5">
                <IndianRupee className="w-4 h-4" />
                {(booking.total_price || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div className="space-y-1.5">
              <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Special Requests</p>
              <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2.5">{booking.special_requests}</p>
            </div>
          )}

          {/* Quick Actions */}
          {(onCreateQuotation || onCreateInvoice) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onCreateQuotation && (
                <Button variant="outline" size="sm" onClick={onCreateQuotation} className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Quotation
                </Button>
              )}
              {onCreateInvoice && (
                <Button variant="outline" size="sm" onClick={onCreateInvoice} className="gap-1.5">
                  <Receipt className="w-3.5 h-3.5" /> Invoice
                </Button>
              )}
            </div>
          )}

          {/* Created */}
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Created {booking.created_at ? format(parseISO(booking.created_at), "dd MMM yyyy, hh:mm a") : "—"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
