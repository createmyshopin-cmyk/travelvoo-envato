import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck, User, Phone, IndianRupee } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";

interface NewBookingPopupProps {
  booking: Record<string, any> | null;
  onClose: () => void;
}

export function NewBookingPopup({ booking, onClose }: NewBookingPopupProps) {
  const { format } = useCurrency();
  const router = useRouter();

  const handleViewBooking = () => {
    onClose();
    router.push("/admin/bookings");
  };

  if (!booking) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={onClose}
            onEscapeKeyDown={onClose}
          >
            <DialogHeader className="text-left">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 w-fit mb-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  New Booking!
                </span>
              </motion.div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                {booking.guest_name ?? "New guest"} — {booking.booking_id ?? ""}
              </DialogTitle>
              <DialogDescription className="text-left pt-1">
                A new booking enquiry has been received.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span className="text-foreground font-medium">{booking.guest_name ?? "—"}</span>
              </div>
              {booking.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{booking.phone}</span>
                </div>
              )}
              {(booking.checkin || booking.checkout) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  <span>
                    {booking.checkin
                      ? format(parseISO(booking.checkin), "dd MMM yyyy")
                      : "—"}
                    {" → "}
                    {booking.checkout
                      ? format(parseISO(booking.checkout), "dd MMM yyyy")
                      : "—"}
                  </span>
                </div>
              )}
              {booking.total_price != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IndianRupee className="w-4 h-4 shrink-0" />
                  <span className="text-foreground font-semibold">
                    {format(Number(booking.total_price))}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>
                Dismiss
              </Button>
              <Button onClick={handleViewBooking}>
                View Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
  );
}
