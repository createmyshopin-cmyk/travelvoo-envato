import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Minus, Plus, CalendarDays, Users, MessageCircle, CheckCircle2, Copy, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, getMinDigitsForCountry } from "@/lib/countryCodes";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveEffectiveTenantId } from "@/lib/resolveEffectiveTenant";
import { useTenant } from "@/context/TenantContext";
import type { Trip, TripDate } from "@/types/trip";

interface TripBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  dates: TripDate[];
}

const Stepper = ({ value, onChange, min = 0, max = 20, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string }) => (
  <div className="flex items-center gap-3">
    {label && <span className="text-sm font-medium text-foreground min-w-[70px]">{label}</span>}
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
    >
      <Minus className="w-3.5 h-3.5 text-foreground" />
    </button>
    <span className="text-base font-bold text-foreground w-6 text-center">{value}</span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus className="w-3.5 h-3.5 text-foreground" />
    </button>
  </div>
);

export default function TripBookingModal({ open, onOpenChange, trip, dates }: TripBookingModalProps) {
  const { format: fmt } = useCurrency();
  const { tenantId: contextTenantId } = useTenant();

  const [selectedDateId, setSelectedDateId] = useState<string>("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [specialRequests, setSpecialRequests] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);

  const availableDates = useMemo(
    () => dates.filter((d) => d.status === "available" || d.status === "few_left"),
    [dates]
  );

  const selectedDate = useMemo(
    () => availableDates.find((d) => d.id === selectedDateId),
    [availableDates, selectedDateId]
  );

  const totalPrice = useMemo(() => {
    if (!selectedDate) return 0;
    return selectedDate.price * adults;
  }, [selectedDate, adults]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!phone.trim()) errs.phone = "Phone is required";
    else {
      const minDigits = getMinDigitsForCountry(phoneCountryCode);
      if (phone.replace(/\D/g, "").length < minDigits)
        errs.phone = `At least ${minDigits} digits`;
    }
    if (!selectedDateId) errs.date = "Select a trip date";
    if (adults < 1) errs.adults = "At least 1 adult";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const ref = `#TRP-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullPhone = `+${phoneCountryCode}${phone}`;
    const effectiveTenantId = await resolveEffectiveTenantId(contextTenantId);

    const dateLabel = selectedDate
      ? `${format(parseISO(selectedDate.startDate), "dd MMM yyyy")} – ${format(parseISO(selectedDate.endDate), "dd MMM yyyy")}`
      : "";

    const message = [
      `Trip Booking Enquiry ${ref}`,
      `Package: ${trip.name}`,
      `Dates: ${dateLabel}`,
      `Adults: ${adults}, Children: ${children}`,
      `Quoted: ${fmt(totalPrice)}`,
      specialRequests.trim() ? `Requests: ${specialRequests.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const meta = {
      trip_id: trip.id,
      slug: trip.slug,
      trip_date_id: selectedDateId,
      start_date: selectedDate?.startDate,
      end_date: selectedDate?.endDate,
      quoted_price: totalPrice,
      price_per_adult: selectedDate?.price,
      adults,
      children,
      booking_ref: ref,
    };

    const { error } = await supabase.from("leads").insert({
      tenant_id: effectiveTenantId,
      source: "trip_booking",
      status: "new",
      full_name: name.trim(),
      phone: fullPhone,
      email: email.trim(),
      message,
      meta,
    } as never);

    setSubmitting(false);

    if (error) {
      setErrors({ submit: error.message || "Failed to save. Please try again." });
      return;
    }

    setBookingRef(ref);
    setShowConfirmation(true);

    const whatsappLines = [
      `🎒 *Trip Booking Enquiry ${ref}*`,
      `📦 *Package:* ${trip.name}`,
      `📅 *Dates:* ${dateLabel}`,
      `👥 *Adults:* ${adults}  |  👶 *Children:* ${children}`,
      `💰 *Total:* ${fmt(totalPrice)}`,
      `👤 *Name:* ${name.trim()}`,
      `📞 *Phone:* ${fullPhone}`,
      email.trim() ? `📧 *Email:* ${email.trim()}` : "",
      specialRequests.trim() ? `📝 *Requests:* ${specialRequests.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const wa = "919876543210";
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(whatsappLines)}`, "_blank");
  };

  const resetAndClose = () => {
    setShowConfirmation(false);
    setSelectedDateId("");
    setAdults(2);
    setChildren(0);
    setName("");
    setEmail("");
    setPhone("");
    setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
    setSpecialRequests("");
    setErrors({});
    setBookingRef("");
    setCopiedRef(false);
    onOpenChange(false);
  };

  const copyRef = () => {
    navigator.clipboard.writeText(bookingRef);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (showConfirmation ? resetAndClose() : onOpenChange(v))}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {showConfirmation ? (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center py-6 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Booking Request Sent!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Our team will reach out to you shortly to confirm your trip to{" "}
                <strong>{trip.name}</strong>.
              </p>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <span className="text-sm font-mono font-bold">{bookingRef}</span>
                <button onClick={copyRef} className="p-1 rounded hover:bg-background transition-colors">
                  {copiedRef ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              <button
                onClick={resetAndClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="text-lg">Book {trip.name}</DialogTitle>
                <DialogDescription>
                  Select a date batch and fill your details. We'll confirm via WhatsApp.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Date batch selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" /> Trip Date *
                  </Label>
                  {availableDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No dates available for this trip.</p>
                  ) : (
                    <Select value={selectedDateId} onValueChange={setSelectedDateId}>
                      <SelectTrigger className={cn(errors.date && "border-destructive")}>
                        <SelectValue placeholder="Choose a date batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDates.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {format(parseISO(d.startDate), "EEE dd MMM")} –{" "}
                            {format(parseISO(d.endDate), "dd MMM yyyy")}
                            {"  ·  "}
                            {fmt(d.price)}/person
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                </div>

                {/* Guests */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Travellers
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    <Stepper label="Adults" value={adults} onChange={setAdults} min={1} max={20} />
                    <Stepper label="Children" value={children} onChange={setChildren} min={0} max={10} />
                  </div>
                  {errors.adults && <p className="text-xs text-destructive">{errors.adults}</p>}
                </div>

                {/* Contact */}
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tbm-name">Full Name *</Label>
                    <Input
                      id="tbm-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={cn(errors.name && "border-destructive")}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tbm-email">Email</Label>
                    <Input
                      id="tbm-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Phone *</Label>
                    <div className="flex gap-2">
                      <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                        <SelectTrigger className="w-[100px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((cc) => (
                            <SelectItem key={cc.code} value={cc.code}>
                              +{cc.code} {cc.flag}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number"
                        className={cn("flex-1", errors.phone && "border-destructive")}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>

                {/* Special requests */}
                <div className="space-y-1.5">
                  <Label htmlFor="tbm-requests">Special Requests</Label>
                  <Textarea
                    id="tbm-requests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={2}
                    placeholder="Anything you'd like us to know"
                  />
                </div>

                {/* Price summary */}
                {selectedDate && (
                  <div className="rounded-xl bg-muted/60 p-4 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {fmt(selectedDate.price)} x {adults} adult{adults !== 1 ? "s" : ""}
                      </span>
                      <span className="font-semibold">{fmt(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{fmt(totalPrice)}</span>
                    </div>
                  </div>
                )}

                {errors.submit && (
                  <p className="text-sm text-destructive text-center">{errors.submit}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || availableDates.length === 0}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      Confirm & Book via WhatsApp
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
