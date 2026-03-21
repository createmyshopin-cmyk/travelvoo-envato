import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarPricing } from "@/hooks/useCalendarPricing";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { RoomSelection } from "@/components/RoomCategories";
import { format, addDays } from "date-fns";
import { Minus, Plus, Tag, PartyPopper, Users, CalendarDays, ArrowRight, Pencil, CheckCircle2, PlusCircle, X, Copy, Check, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, getMinDigitsForCountry } from "@/lib/countryCodes";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import BookingCalendar, { getDefaultPrice } from "@/components/BookingCalendar";
import type { RoomCategory } from "@/types/stay";

interface AddOn {
  id: string;
  label: string;
  price: number;
  optional: boolean;
}

interface Coupon {
  code: string;
  type: "percentage" | "flat";
  value: number;
  max_discount: number | null;
  min_purchase: number;
  label: string;
}

interface BookingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stayName: string;
  stayId: string;
  roomCategories: RoomCategory[];
  preselectedRooms?: RoomSelection[];
  autoAppliedCoupon?: { code: string; discount: number } | null;
  maxAdults?: number;
  maxChildren?: number;
  maxPets?: number;
}

const generateBookingId = () => `#${Math.floor(1000 + Math.random() * 9000)}`;

const Stepper = ({ value, onChange, min = 0, max = 10, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string }) => (
  <div className="flex items-center gap-3">
    {label && <span className="text-sm font-medium text-foreground min-w-[60px]">{label}</span>}
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

const BookingFormModal = ({ open, onOpenChange, stayName, stayId, roomCategories: initialRoomCategories, preselectedRooms, autoAppliedCoupon, maxAdults = 20, maxChildren = 5, maxPets = 5 }: BookingFormModalProps) => {
  const { format: formatMoney } = useCurrency();
  const { settings: siteSettings } = useSiteSettings();
  const [roomCategories, setRoomCategories] = useState(initialRoomCategories);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [email, setEmail] = useState("");
  const [soloTraveller, setSoloTraveller] = useState(false);
  const [groupBooking, setGroupBooking] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [guests, setGuests] = useState(2);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [dateRanges, setDateRanges] = useState<{ checkIn: Date; checkOut: Date }[]>([]);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponBanner, setShowCouponBanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calendarExpanded, setCalendarExpanded] = useState(true);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [copiedBookingId, setCopiedBookingId] = useState(false);

  const [dbAddOns, setDbAddOns] = useState<AddOn[]>([]);

  useEffect(() => {
    if (!open || !stayId) return;
    // Fetch fresh room categories (for latest available count set by admin)
    supabase
      .from("room_categories")
      .select("id, name, images, max_guests, available, amenities, price, original_price")
      .eq("stay_id", stayId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRoomCategories(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            images: r.images || [],
            maxGuests: r.max_guests,
            available: r.available,
            amenities: r.amenities || [],
            price: r.price,
            originalPrice: r.original_price,
          })));
        }
      });
    // Fetch add-ons
    (supabase.from("stay_addons") as any)
      .select("id, name, price, optional")
      .eq("stay_id", stayId)
      .order("sort_order")
      .then(({ data }: { data: any[] | null }) => {
        if (data && data.length > 0) {
          setDbAddOns(data.map((a) => ({ id: a.id, label: a.name, price: a.price, optional: a.optional })));
        } else {
          setDbAddOns([]);
        }
      });
  }, [open, stayId]);

  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>(() =>
    preselectedRooms || roomCategories.map((r) => ({
      name: r.name,
      price: r.price,
      originalPrice: r.originalPrice,
      count: 0,
      selected: false,
    }))
  );

  // Sync preselectedRooms and clear errors when modal opens
  useEffect(() => {
    if (open) {
      if (preselectedRooms) setRoomSelections(preselectedRooms);
      setSubmitError(null);
    }
  }, [open, preselectedRooms]);

  // Auto-apply coupon from StayDetails
  useEffect(() => {
    if (open && autoAppliedCoupon) {
      setCouponCode(autoAppliedCoupon.code);
      setAppliedCoupon({
        code: autoAppliedCoupon.code,
        type: "flat",
        value: autoAppliedCoupon.discount,
        label: `${formatMoney(autoAppliedCoupon.discount)} OFF`,
      });
      setCouponError("");
    }
  }, [open, autoAppliedCoupon, formatMoney]);

  // Real-time pricing from admin calendar — pass all room category IDs
  const allRoomCategoryIds = useMemo(() => roomCategories.map((r) => r.id), [roomCategories]);
  const { customPricing, unavailableDates: dbUnavailableDates, getPriceForDate: getDbPrice, getMinNightsForDate, isBookedDate, isCooldownDate, cooldownMinutes, lastFetchedAt } = useCalendarPricing(stayId, allRoomCategoryIds);

  // Resolve display price per room: calendar (room-specific → global) → room_categories base
  const getDisplayPriceForRoom = useCallback(
    (room: RoomSelection, roomCategoryId?: string): number => {
      const firstDate = dateRanges[0]?.checkIn;
      if (!firstDate) return room.price;
      // 1) Room-specific calendar price
      if (roomCategoryId) {
        const roomPrice = getDbPrice(firstDate, roomCategoryId);
        if (roomPrice != null) return roomPrice;
      }
      // 2) Global calendar price (admin set "all" rooms)
      const globalPrice = getDbPrice(firstDate);
      if (globalPrice != null) return globalPrice;
      // 3) Fallback to base from room_categories
      return room.price;
    },
    [dateRanges, getDbPrice]
  );

  const unavailableDates = dbUnavailableDates;

  const calendarBasePrice = useMemo(() => {
    const selected = roomSelections.filter((r) => r.selected && r.count > 0);
    if (selected.length === 0) return roomCategories[0]?.price || 3000;
    return Math.min(...selected.map((r) => r.price));
  }, [roomSelections, roomCategories]);

  const [minNightsError, setMinNightsError] = useState("");

  const handleRangeChange = (ci: Date | undefined, co: Date | undefined) => {
    setCheckIn(ci);
    setCheckOut(co);
    setMinNightsError("");

    if (ci && co) {
      const nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
      const requiredMinNights = getMinNightsForDate(ci);
      if (requiredMinNights > 1 && nights < requiredMinNights) {
        setMinNightsError(`Minimum ${requiredMinNights} nights required for ${format(ci, "dd MMM")}`);
      }
    }
  };

  const addDateRange = () => {
    if (checkIn && checkOut) {
      setDateRanges((prev) => [...prev, { checkIn, checkOut }]);
      setCheckIn(undefined);
      setCheckOut(undefined);
      setCalendarExpanded(false);
    }
  };

  const removeDateRange = (index: number) => {
    setDateRanges((prev) => prev.filter((_, i) => i !== index));
  };

  const openCalendarForNew = () => {
    setCheckIn(undefined);
    setCheckOut(undefined);
    setCalendarExpanded(true);
  };

  const toggleRoom = (index: number) => {
    setRoomSelections((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, selected: !r.selected, count: !r.selected ? Math.max(1, r.count) : 0 }
          : r
      )
    );
  };

  const updateRoomCount = (index: number, count: number) => {
    setRoomSelections((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, count: Math.max(0, Math.min(roomCategories[index]?.available ?? 10, count)), selected: count > 0 } : r
      )
    );
  };

  // Calculate total nights across all date ranges
  const totalNights = useMemo(() => {
    return dateRanges.reduce((sum, range) => {
      const diff = Math.ceil((range.checkOut.getTime() - range.checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + (diff > 0 ? diff : 0);
    }, 0);
  }, [dateRanges]);

  // For backward compat in conditions
  const nights = totalNights;
  const hasDates = dateRanges.length > 0;

  // Dynamic pricing across all date ranges — room-category-specific overrides
  // Per-room display prices from calendar — re-computes when calendar data updates (realtime)
  const roomDisplayPrices = useMemo(() => {
    return roomCategories.map((rc, i) => {
      if (dateRanges.length === 0) return roomCategories[i]?.price ?? 0;
      const firstDate = dateRanges[0].checkIn;
      const roomId = rc.id;
      return getDbPrice(firstDate, roomId) ?? getDbPrice(firstDate) ?? rc.price ?? 0;
    });
  }, [dateRanges, roomCategories, getDbPrice]);

  const roomTotal = useMemo(() => {
    if (dateRanges.length === 0) return 0;
    const selected = roomSelections.filter((r) => r.selected && r.count > 0);
    let total = 0;
    for (const room of selected) {
      const roomCat = roomCategories.find((rc) => rc.name === room.name) ?? roomCategories[roomCategories.findIndex((rc) => rc.name === room.name)];
      const roomCategoryId = roomCat?.id;
      for (const range of dateRanges) {
        let d = range.checkIn;
        while (d < range.checkOut) {
          // Try room-specific price first, then fall back to generic price
          const dbPrice = roomCategoryId
            ? (getDbPrice(d, roomCategoryId) ?? getDbPrice(d))
            : getDbPrice(d);
          total += (dbPrice ?? getDefaultPrice(d, room.price)) * room.count;
          d = addDays(d, 1);
        }
      }
    }
    return total;
  }, [roomSelections, dateRanges, roomCategories]);

  const addOnTotal = useMemo(() => {
    return dbAddOns.filter((a) => selectedAddOns.includes(a.label)).reduce((sum, a) => sum + a.price, 0);
  }, [selectedAddOns, dbAddOns]);

  const subtotal = roomTotal + addOnTotal;

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    let discount = appliedCoupon.type === "percentage"
      ? Math.round(subtotal * (appliedCoupon.value / 100))
      : Math.min(appliedCoupon.value, subtotal);
    if (appliedCoupon.max_discount && discount > appliedCoupon.max_discount) {
      discount = appliedCoupon.max_discount;
    }
    return discount;
  }, [appliedCoupon, subtotal]);

  const grandTotal = Math.max(0, subtotal - couponDiscount);

  const toggleAddOn = (label: string) => {
    setSelectedAddOns((prev) => (prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]));
  };

  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError("");

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      setCouponError("Invalid coupon code");
      setAppliedCoupon(null);
      setApplyingCoupon(false);
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("This coupon has expired");
      setAppliedCoupon(null);
      setApplyingCoupon(false);
      return;
    }
    if (data.starts_at && new Date(data.starts_at) > new Date()) {
      setCouponError("This coupon is not yet active");
      setAppliedCoupon(null);
      setApplyingCoupon(false);
      return;
    }
    if (data.usage_limit && data.usage_count >= data.usage_limit) {
      setCouponError("This coupon has reached its usage limit");
      setAppliedCoupon(null);
      setApplyingCoupon(false);
      return;
    }
    if (data.min_purchase > 0 && subtotal < data.min_purchase) {
      setCouponError(`Min order ${formatMoney(data.min_purchase)} required`);
      setAppliedCoupon(null);
      setApplyingCoupon(false);
      return;
    }

    const type: "percentage" | "flat" = (data.type === "percent" || data.type === "percentage") ? "percentage" : "flat";
    const label = type === "percentage" ? `${data.value}% OFF` : `${formatMoney(data.value)} OFF`;

    setAppliedCoupon({ code: data.code, type, value: data.value, max_discount: data.max_discount, min_purchase: data.min_purchase, label });
    setShowCouponBanner(true);
    setTimeout(() => setShowCouponBanner(false), 3000);
    setApplyingCoupon(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const selectedRooms = roomSelections.filter((r) => r.selected && r.count > 0);

  const validate = () => {
    setSubmitError(null);
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    const minDigits = getMinDigitsForCountry(phoneCountryCode);
    if (phone.length < minDigits) errs.phone = `Enter a valid ${minDigits}-digit number.`;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email.";
    if (selectedRooms.length === 0) errs.rooms = "Select at least one room.";
    if (dateRanges.length === 0) errs.dates = "Select at least one date range.";
    for (const range of dateRanges) {
      const nights = Math.ceil((range.checkOut.getTime() - range.checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const reqMin = getMinNightsForDate(range.checkIn);
      if (reqMin > 1 && nights < reqMin) {
        errs.dates = `Minimum ${reqMin} nights required for ${format(range.checkIn, "dd MMM")}`;
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const whatsappMessageRef = useRef("");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);

    // Server-side overlap + cooldown check for each date range
    for (const range of dateRanges) {
      const ciStr = format(range.checkIn, "yyyy-MM-dd");
      const coStr = format(range.checkOut, "yyyy-MM-dd");

      const { data: overlaps } = await supabase
        .from("bookings")
        .select("booking_id, checkin, checkout, guest_name")
        .eq("stay_id", stayId)
        .in("status", ["pending", "confirmed"])
        .lt("checkin", coStr)
        .gt("checkout", ciStr);

      if (overlaps && overlaps.length > 0) {
        setErrors((p) => ({
          ...p,
          dates: `Dates ${format(range.checkIn, "dd MMM")}–${format(range.checkOut, "dd MMM")} conflict with an existing booking`,
        }));
        setSubmitting(false);
        return;
      }
    }

    const newBookingId = generateBookingId();
    setBookingId(newBookingId);

    const roomsJson = selectedRooms.map((r) => ({ name: r.name, count: r.count, price: r.price }));
    const addonsJson = dbAddOns.filter((a) => selectedAddOns.includes(a.label)).map((a) => ({ label: a.label, price: a.price }));
    const firstRange = dateRanges[0];

    const fullPhone = phoneCountryCode + phone;
    const { data: rpcData, error } = await supabase.rpc("create_booking_enquiry", {
      p_booking_id: newBookingId,
      p_guest_name: name,
      p_phone: fullPhone,
      p_phone_country_code: phoneCountryCode,
      p_email: email || "",
      p_stay_id: stayId,
      p_checkin: firstRange ? format(firstRange.checkIn, "yyyy-MM-dd") : null,
      p_checkout: firstRange ? format(firstRange.checkOut, "yyyy-MM-dd") : null,
      p_rooms: roomsJson,
      p_addons: addonsJson,
      p_total_price: grandTotal,
      p_coupon_code: appliedCoupon?.code || null,
      p_special_requests: specialRequests.trim() || null,
      p_adults: guests,
      p_children: children,
      p_pets: pets,
      p_solo_traveller: soloTraveller,
      p_group_booking: groupBooking,
      p_group_name: groupName.trim() || "",
    });

    setSubmitting(false);

    const insertedBooking = rpcData as { id: string } | null;

    if (error) {
      console.error("Failed to save booking:", error);
      setSubmitError(error.message || "Failed to save booking. Please try again.");
      return;
    }

    if (siteSettings?.auto_generate_invoice && insertedBooking?.id) {
      const roomTotal = roomsJson.reduce((s, r) => s + (r.price || 0) * (r.count || 1), 0);
      const addonsTotal = addonsJson.reduce((s, a) => s + (a.price || 0), 0);
      await supabase.from("invoices").insert({
        invoice_id: `INV-${Date.now().toString(36).toUpperCase()}`,
        booking_id: insertedBooking.id,
        guest_name: name,
        phone: fullPhone,
        email: email || "",
        stay_id: stayId,
        checkin: firstRange ? format(firstRange.checkIn, "yyyy-MM-dd") : null,
        checkout: firstRange ? format(firstRange.checkOut, "yyyy-MM-dd") : null,
        rooms: roomsJson,
        addons: addonsJson,
        room_total: roomTotal,
        addons_total: addonsTotal,
        total_price: grandTotal,
        coupon_code: appliedCoupon?.code || null,
        payment_status: "pending",
      } as any);
    }

    if (appliedCoupon?.code) {
      await supabase.rpc("increment_coupon_usage", { coupon_code_input: appliedCoupon.code });
    }

    const roomLines = selectedRooms.map((r) => `${r.name} — ${r.count} room(s)`).join("\n");
    const addOnLines = dbAddOns.filter((a) => selectedAddOns.includes(a.label))
      .map((a) => `${a.label} — ${formatMoney(a.price)}`)
      .join("\n");

    const guestLine = soloTraveller
      ? `🧳 *Solo Traveller:* Yes`
      : `👥 *Guests:* ${guests}\n👶 *Children:* ${children}`;

    const groupLines = groupBooking
      ? `\n👥 *Group Booking:* Yes${groupName ? `\n📛 *Group Name:* ${groupName}` : ""}`
      : "";

    const specialRequestLine = specialRequests.trim()
      ? `\n📝 *Special Requests:* ${specialRequests.trim()}`
      : "";

    const dateLines = dateRanges.map((r, i) => {
      const rangeNights = Math.ceil((r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return `📅 *Trip ${i + 1}:* ${format(r.checkIn, "dd MMM yyyy")} → ${format(r.checkOut, "dd MMM yyyy")} (${rangeNights} nights)`;
    }).join("\n");

    const stayPageUrl = `${window.location.origin}/stay/${stayId}`;

    const message = `*New Booking Enquiry*

🔖 *Booking ID:* ${newBookingId}
🏷 *Stay ID:* ${stayId}
🏨 *Stay:* ${stayName}

🔗 *Stay Link:*
${stayPageUrl}

👤 *Name:* ${name}
📱 *Phone:* +${phoneCountryCode} ${phone}
📧 *Email:* ${email || "Not provided"}

${guestLine}
🐾 *Pets:* ${pets}${groupLines}

🛏 *Rooms:*
${roomLines || "Not selected"}

${dateLines || "📅 *Dates:* Not selected"}
🌙 *Total Nights:* ${totalNights}

${addOnLines ? `*Add-ons:*\n${addOnLines}\n` : ""}${appliedCoupon ? `🏷 *Coupon Applied:* ${appliedCoupon.code}\n` : ""}${specialRequestLine}
💰 *Estimated Total:* ${formatMoney(grandTotal)}`;

    whatsappMessageRef.current = message;
    setShowConfirmation(true);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessageRef.current);
    const num = (siteSettings?.whatsapp_number || "").replace(/\D/g, "") || "919876543210";
    const waNum = num.startsWith("91") ? num : `91${num}`;
    window.open(`https://wa.me/${waNum}?text=${encoded}`, "_blank");
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(bookingId);
    setCopiedBookingId(true);
    setTimeout(() => setCopiedBookingId(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-none">
        {/* Coupon Success Banner */}
        <AnimatePresence>
          {showCouponBanner && appliedCoupon && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="bg-savings text-savings-foreground px-4 py-3 text-center rounded-t-2xl"
            >
              <div className="flex items-center justify-center gap-2">
                <PartyPopper className="w-5 h-5" />
                <span className="font-bold text-sm">Coupon Applied! {appliedCoupon.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-5 pb-0">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-extrabold text-foreground">Book Your Stay</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Fill the details to send enquiry.</DialogDescription>
          </DialogHeader>
        </div>

        <div ref={formContainerRef} className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Name</Label>
            <Input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              className={cn("h-12 rounded-xl bg-muted border-none text-sm", errors.name && "ring-2 ring-destructive")}
            />
            {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">WhatsApp Number</Label>
            <div className="flex gap-2">
              <Select value={phoneCountryCode} onValueChange={(v) => { setPhoneCountryCode(v); setErrors((p) => ({ ...p, phone: "" })); }}>
                <SelectTrigger className={cn("h-12 w-[120px] shrink-0 rounded-xl bg-muted border-none text-sm", errors.phone && "ring-2 ring-destructive")}>
                  <SelectValue>
                    {COUNTRY_CODES.find((c) => c.code === phoneCountryCode) ? (
                      <span className="flex items-center gap-2">
                        <span>{COUNTRY_CODES.find((c) => c.code === phoneCountryCode)?.flag}</span>
                        <span>{COUNTRY_CODES.find((c) => c.code === phoneCountryCode)?.dialCode}</span>
                      </span>
                    ) : (
                      "Select"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.dialCode}</span>
                        <span className="text-muted-foreground">{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Enter number"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setErrors((p) => ({ ...p, phone: "" })); }}
                inputMode="numeric"
                className={cn("h-12 flex-1 rounded-xl bg-muted border-none text-sm", errors.phone && "ring-2 ring-destructive")}
              />
            </div>
            {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Email ID</Label>
            <Input
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              className={cn("h-12 rounded-xl bg-muted border-none text-sm", errors.email && "ring-2 ring-destructive")}
            />
            {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
          </div>

          {/* Solo / Group toggles */}
          <div className="space-y-2">
            {/* Solo Traveller */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted cursor-pointer min-h-[44px] transition-all">
              <Checkbox
                checked={soloTraveller}
                onCheckedChange={(checked) => {
                  const val = !!checked;
                  setSoloTraveller(val);
                  if (val) { setGuests(1); setChildren(0); setGroupBooking(false); }
                }}
                className="data-[state=checked]:bg-savings data-[state=checked]:border-savings"
              />
              <span className="text-sm font-semibold text-foreground">Solo Traveller</span>
              {soloTraveller && (
                <span className="ml-auto text-xs font-semibold text-savings bg-savings/10 px-2 py-0.5 rounded-full">
                  🧳 Solo Mode
                </span>
              )}
            </label>

            {/* Group Booking */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted cursor-pointer min-h-[44px] transition-all">
              <Checkbox
                checked={groupBooking}
                onCheckedChange={(checked) => {
                  const val = !!checked;
                  setGroupBooking(val);
                  if (val) { setSoloTraveller(false); if (guests < 5) setGuests(5); }
                }}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Group Booking</span>
              </div>
              {groupBooking && (
                <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  👥 Group Mode
                </span>
              )}
            </label>
          </div>

          {/* Group Booking Fields */}
          <AnimatePresence>
            {groupBooking && (
              <motion.div
                key="group-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Group Name</Label>
                  <Input
                    placeholder="e.g. Office Trip 2026"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="h-12 rounded-xl bg-muted border-none text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Special Requests</Label>
                  <textarea
                    placeholder="Any special arrangements, dietary needs, etc."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl bg-muted border-none text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guests / Children / Pets */}
          <AnimatePresence>
            {soloTraveller ? (
              <motion.p
                key="solo-note"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-muted-foreground font-medium"
              >
                Solo traveller booking selected.
              </motion.p>
            ) : (
              <motion.div
                key="guest-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <Label className="text-xs font-semibold text-foreground">Guests</Label>
                <div className="space-y-3 bg-muted rounded-xl p-3">
                  <Stepper value={guests} onChange={setGuests} min={1} max={maxAdults} label="Adults" />
                  <Stepper value={children} onChange={setChildren} min={0} max={maxChildren} label="Children" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Pets</Label>
            <div className="bg-muted rounded-xl p-3">
              <Stepper value={pets} onChange={setPets} min={0} max={maxPets} label="Pets" />
              <AnimatePresence>
                {pets > 0 && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-muted-foreground mt-1.5 ml-[72px]"
                    >
                      Pet charges may apply.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

          {/* Room Categories - Multi Select */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Select Room Categories</Label>
            {errors.rooms && <p className="text-xs text-destructive font-medium">{errors.rooms}</p>}
            <div className="space-y-2">
              {roomSelections.map((room, index) => (
                <div
                  key={room.name}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all",
                    room.selected ? "border-primary bg-primary/5" : "border-border bg-muted"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleRoom(index)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={room.selected}
                        onCheckedChange={() => toggleRoom(index)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm font-semibold text-foreground">{room.name}</span>
                    </div>
                    <span className="text-sm font-bold text-primary" aria-live="polite">
                      {formatMoney(getDisplayPriceForRoom(
                        room,
                        (roomCategories.find((rc) => rc.name === room.name) ?? roomCategories[index])?.id
                      ))}
                      <span className="text-xs font-normal text-muted-foreground"> /night</span>
                    </span>
                  </button>
                  <AnimatePresence>
                    {room.selected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <Stepper
                          value={room.count}
                          onChange={(c) => updateRoomCount(index, c)}
                          min={1}
                          max={roomCategories[index]?.available ?? 10}
                          label="Rooms"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Dates — Multiple Date Ranges */}
          <div className="space-y-2 relative">
            <Label className="text-xs font-semibold text-foreground">Select Dates</Label>

            {/* Saved date range cards */}
            <AnimatePresence>
              {dateRanges.map((range, index) => {
                const rangeNights = Math.ceil((range.checkOut.getTime() - range.checkIn.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <motion.div
                    key={`range-${index}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-muted rounded-2xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">Trip {index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { removeDateRange(index); setCalendarExpanded(true); }}
                        className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background rounded-xl px-2.5 py-2 text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Check-in</p>
                        <p className="text-sm font-extrabold text-foreground">{format(range.checkIn, "dd MMM")}</p>
                        <p className="text-[10px] text-muted-foreground">{format(range.checkIn, "EEE")}</p>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-primary">{rangeNights}N</span>
                      </div>
                      <div className="flex-1 bg-background rounded-xl px-2.5 py-2 text-center">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Check-out</p>
                        <p className="text-sm font-extrabold text-foreground">{format(range.checkOut, "dd MMM")}</p>
                        <p className="text-[10px] text-muted-foreground">{format(range.checkOut, "EEE")}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Calendar for selecting new range */}
            <AnimatePresence mode="wait">
              {calendarExpanded ? (
                <motion.div
                  key="calendar-full"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <BookingCalendar
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onRangeChange={(ci, co) => {
                      handleRangeChange(ci, co);
                      if (ci && co) {
                        const nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
                        const requiredMinNights = getMinNightsForDate(ci);
                        if (requiredMinNights > 1 && nights < requiredMinNights) return;
                        setShowCheckmark(true);
                        setTimeout(() => {
                          setDateRanges((prev) => [...prev, { checkIn: ci, checkOut: co }]);
                          setCheckIn(undefined);
                          setCheckOut(undefined);
                          setCalendarExpanded(false);
                          setMinNightsError("");
                          setTimeout(() => setShowCheckmark(false), 600);
                        }, 500);
                      }
                    }}
                    basePrice={calendarBasePrice}
                    customPricing={customPricing}
                    unavailableDates={unavailableDates}
                    minNightsError={minNightsError}
                    isBookedDate={isBookedDate}
                    isCooldownDate={isCooldownDate}
                    cooldownMinutes={cooldownMinutes}
                  />
                  {/* Checkmark overlay */}
                  <AnimatePresence>
                    {showCheckmark && (
                      <motion.div
                        key="checkmark"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl z-10"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <motion.div
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                          >
                            <CheckCircle2 className="w-12 h-12 text-savings" />
                          </motion.div>
                          <span className="text-sm font-bold text-foreground">Dates Added!</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Live sync indicator */}
                  {lastFetchedAt && (
                    <div className="flex items-center gap-2 mt-2 px-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Live prices · Synced {lastFetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {cooldownMinutes > 0 && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                          {cooldownMinutes < 60 ? `${cooldownMinutes}min` : cooldownMinutes < 1440 ? `${Math.floor(cooldownMinutes / 60)}h${cooldownMinutes % 60 ? ` ${cooldownMinutes % 60}m` : ""}` : `${Math.floor(cooldownMinutes / 1440)}d`} buffer
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Add more dates button */}
            {!calendarExpanded && (
              <motion.button
                type="button"
                onClick={openCalendarForNew}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                <PlusCircle className="w-4 h-4" />
                Add More Dates
              </motion.button>
            )}

            {/* Total nights summary */}
            {dateRanges.length > 1 && (
              <div className="bg-primary/5 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {dateRanges.length} trips selected
                </span>
                <span className="text-xs font-bold text-primary">{totalNights} total nights</span>
              </div>
            )}
          </div>

          {/* Add-ons — only visible after dates selected and if add-ons exist */}
          <AnimatePresence>
            {hasDates && dbAddOns.length > 0 && (
              <motion.div
                key="addons-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2"
              >
                <Label className="text-xs font-semibold text-foreground">Add-ons</Label>
                <div className="space-y-2">
                  {dbAddOns.map((addon) => (
                    <label
                      key={addon.label}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                        selectedAddOns.includes(addon.label) ? "border-savings bg-savings/5" : "border-border bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedAddOns.includes(addon.label)}
                          onCheckedChange={() => toggleAddOn(addon.label)}
                          className="data-[state=checked]:bg-savings data-[state=checked]:border-savings"
                        />
                        <span className="text-sm font-medium text-foreground">{addon.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatMoney(addon.price)}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Special Requests — only after dates selected */}
          <AnimatePresence>
            {hasDates && (
              <motion.div
                key="special-requests-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-1.5"
              >
                <Label className="text-xs font-semibold text-foreground">Special Requests</Label>
                <textarea
                  placeholder="Any special arrangements, dietary needs, celebrations, etc."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-muted border-none text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Coupon Code — only after dates selected */}
          <AnimatePresence>
            {hasDates && (
              <motion.div
                key="coupon-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2"
              >
                <Label className="text-xs font-semibold text-foreground">Apply Coupon</Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-savings bg-savings/5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-savings" />
                      <span className="text-sm font-bold text-savings">{appliedCoupon.code}</span>
                      <span className="text-xs text-savings font-medium">({appliedCoupon.label})</span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-xs font-semibold text-destructive">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                      className="h-12 rounded-xl bg-muted border-none text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={!couponCode.trim() || applyingCoupon}
                      className="h-12 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive font-medium">{couponError}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Price Summary — only after dates selected */}
          <AnimatePresence>
            {selectedRooms.length > 0 && hasDates && (
              <motion.div
                key="price-summary"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-muted rounded-2xl p-4 space-y-3"
              >
                <h3 className="text-sm font-bold text-foreground">Price Summary</h3>

                <div className="space-y-2 text-sm">
                  {selectedRooms.map((room) => {
                    const roomCat = roomCategories.find((rc) => rc.name === room.name);
                    const roomCategoryId = roomCat?.id;
                    let roomNightTotal = 0;
                    for (const range of dateRanges) {
                      let d = range.checkIn;
                      while (d < range.checkOut) {
                        const dbPrice = roomCategoryId
                          ? (getDbPrice(d, roomCategoryId) ?? getDbPrice(d))
                          : getDbPrice(d);
                        roomNightTotal += (dbPrice ?? getDefaultPrice(d, room.price)) * room.count;
                        d = addDays(d, 1);
                      }
                    }
                    return (
                      <div key={room.name} className="space-y-0.5">
                        <span className="text-muted-foreground font-medium">{room.name}</span>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {totalNights} {totalNights === 1 ? "night" : "nights"} × {room.count} {room.count === 1 ? "room" : "rooms"}
                          </span>
                          <span className="font-semibold text-foreground">{formatMoney(roomNightTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {addOnTotal > 0 && (
                  <div className="space-y-1.5 text-sm border-t border-border pt-3">
                    <span className="text-muted-foreground font-medium">Add-ons</span>
                    {dbAddOns.filter((a) => selectedAddOns.includes(a.label)).map((a) => (
                      <div key={a.label} className="flex justify-between">
                        <span className="text-muted-foreground">{a.label}</span>
                        <span className="text-foreground">{formatMoney(a.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="border-t border-border pt-3 flex justify-between text-sm">
                    <span className="text-savings font-medium">Coupon Discount ({appliedCoupon?.label})</span>
                    <span className="text-savings font-bold">{formatMoney(-couponDiscount)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total Estimate</span>
                  <span className="text-xl font-extrabold text-primary">{formatMoney(grandTotal)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date validation error */}
          {errors.dates && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">{errors.dates}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground font-bold text-sm py-3.5 rounded-xl shadow-soft active:scale-[0.98] transition-transform min-h-[48px] disabled:opacity-60"
          >
            {submitting ? "Checking availability..." : "Send Booking Enquiry"}
          </button>
        </div>
      </DialogContent>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-[380px] rounded-2xl border-none p-0 gap-0">
          <div className="p-6 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 bg-savings/15 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-8 h-8 text-savings" />
            </motion.div>

            <div>
              <h3 className="text-lg font-extrabold text-foreground">Booking Enquiry Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We have sent your booking enquiry to the host. They will contact you on WhatsApp shortly.
              </p>
            </div>

            <div className="bg-muted rounded-xl p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Booking ID</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground">{bookingId}</span>
                  <button
                    onClick={handleCopyBookingId}
                    className="w-7 h-7 rounded-lg bg-background flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    {copiedBookingId ? (
                      <Check className="w-3.5 h-3.5 text-savings" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Stay</span>
                <span className="text-sm font-semibold text-foreground">{stayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Stay ID</span>
                <span className="text-sm font-semibold text-foreground">{stayId}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleCloseConfirmation}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground active:scale-95 transition-transform min-h-[48px]"
              >
                Close
              </button>
              <button
                onClick={handleOpenWhatsApp}
                className="flex-1 py-3 rounded-xl bg-savings text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform min-h-[48px]"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default BookingFormModal;
