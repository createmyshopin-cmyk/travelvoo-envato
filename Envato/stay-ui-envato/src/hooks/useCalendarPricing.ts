import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSameDay, addDays, format } from "date-fns";
import type { DatePricing } from "@/components/BookingCalendar";

interface CalendarPricingEntry {
  id: string;
  date: string;
  price: number;
  original_price: number;
  is_blocked: boolean;
  available: number;
  min_nights: number;
  cooldown_minutes: number | null;
  room_category_id: string | null;
  stay_id: string;
}

interface BookingSlot {
  checkin: string;
  checkout: string;
  status: string;
}

export function useCalendarPricing(stayId: string, roomCategoryIds: string[]) {
  const [entries, setEntries] = useState<CalendarPricingEntry[]>([]);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [cooldownMinutes, setCooldownMinutes] = useState(1440);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetchPricing = useCallback(async () => {
    if (!stayId) return;

    const [pricingRes, bookingsRes, stayRes] = await Promise.all([
      supabase
        .from("calendar_pricing")
        .select("id, date, price, original_price, is_blocked, available, min_nights, cooldown_minutes, room_category_id, stay_id")
        .eq("stay_id", stayId),
      supabase
        .from("bookings")
        .select("checkin, checkout, status")
        .eq("stay_id", stayId)
        .in("status", ["pending", "confirmed"]),
      supabase
        .from("stays")
        .select("cooldown_minutes")
        .eq("id", stayId)
        .single(),
    ]);

    if (pricingRes.data) setEntries(pricingRes.data as CalendarPricingEntry[]);
    if (bookingsRes.data) setBookings(bookingsRes.data as BookingSlot[]);
    setCooldownMinutes(stayRes.data?.cooldown_minutes ?? 1440);
    setLastFetchedAt(new Date());
  }, [stayId]);

  useEffect(() => {
    if (!stayId) return;
    fetchPricing();

    const pricingChannel = supabase
      .channel(`calendar_pricing_${stayId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_pricing", filter: `stay_id=eq.${stayId}` }, () => fetchPricing())
      .subscribe();

    const bookingsChannel = supabase
      .channel(`bookings_cal_${stayId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `stay_id=eq.${stayId}` }, () => fetchPricing())
      .subscribe();

    return () => {
      supabase.removeChannel(pricingChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [stayId, fetchPricing]);

  const relevantEntries = useMemo(() => {
    if (roomCategoryIds.length === 0) return entries;
    return entries.filter(
      (e) => e.room_category_id === null || roomCategoryIds.includes(e.room_category_id)
    );
  }, [entries, roomCategoryIds]);

  // Resolve effective cooldown for a given date (per-date override > global)
  const getEffectiveCooldown = useCallback(
    (dateStr: string): number => {
      const entry = entries.find((e) => e.date === dateStr);
      return entry?.cooldown_minutes ?? cooldownMinutes;
    },
    [entries, cooldownMinutes]
  );

  // Booked dates + cooldown buffer dates (respecting per-date overrides)
  const bookedAndCooldownDates: Date[] = useMemo(() => {
    const dates = new Set<string>();

    for (const b of bookings) {
      if (!b.checkin || !b.checkout) continue;
      let d = new Date(b.checkin + "T00:00:00");
      const co = new Date(b.checkout + "T00:00:00");

      while (d < co) {
        dates.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 1);
      }

      // Per-date cooldown on checkout date, fallback to global
      const effectiveMins = getEffectiveCooldown(b.checkout);
      const coolDays = Math.ceil(effectiveMins / 1440);
      for (let i = 0; i < coolDays; i++) {
        dates.add(format(addDays(co, i), "yyyy-MM-dd"));
      }
    }

    return Array.from(dates).map((ds) => new Date(ds + "T00:00:00"));
  }, [bookings, getEffectiveCooldown]);

  const customPricing: DatePricing[] = useMemo(() => {
    return relevantEntries
      .filter((e) => !e.is_blocked)
      .map((e) => ({
        date: new Date(e.date + "T00:00:00"),
        price: e.price,
        originalPrice: e.original_price > 0 && e.original_price !== e.price ? e.original_price : undefined,
        minNights: e.min_nights > 1 ? e.min_nights : undefined,
      }));
  }, [relevantEntries]);

  const unavailableDates: Date[] = useMemo(() => {
    const blockedFromPricing = relevantEntries
      .filter((e) => e.is_blocked || e.available <= 0)
      .map((e) => new Date(e.date + "T00:00:00"));

    const allUnavail = [...blockedFromPricing];

    for (const bd of bookedAndCooldownDates) {
      if (!allUnavail.some((d) => isSameDay(d, bd))) {
        allUnavail.push(bd);
      }
    }

    return allUnavail;
  }, [relevantEntries, bookedAndCooldownDates]);

  const getPriceForDate = useCallback(
    (date: Date, roomCategoryId?: string): number | undefined => {
      if (roomCategoryId) {
        const roomEntry = relevantEntries.find(
          (e) =>
            isSameDay(new Date(e.date + "T00:00:00"), date) &&
            !e.is_blocked &&
            e.price >= 100 && e.price <= 100000 &&
            e.room_category_id === roomCategoryId
        );
        if (roomEntry) return roomEntry.price;
      }
      const globalEntry = relevantEntries.find(
        (e) =>
          isSameDay(new Date(e.date + "T00:00:00"), date) &&
          !e.is_blocked &&
          e.price >= 100 && e.price <= 100000 &&
          (roomCategoryId ? e.room_category_id === null : true)
      );
      return globalEntry?.price;
    },
    [relevantEntries]
  );

  const getOriginalPriceForDate = useCallback(
    (date: Date, roomCategoryId?: string): number | undefined => {
      if (roomCategoryId) {
        const roomEntry = relevantEntries.find(
          (e) =>
            isSameDay(new Date(e.date + "T00:00:00"), date) &&
            !e.is_blocked &&
            e.room_category_id === roomCategoryId
        );
        if (roomEntry && roomEntry.original_price > 0 && roomEntry.original_price !== roomEntry.price) {
          return roomEntry.original_price;
        }
      }
      const globalEntry = relevantEntries.find(
        (e) =>
          isSameDay(new Date(e.date + "T00:00:00"), date) &&
          !e.is_blocked &&
          (roomCategoryId ? e.room_category_id === null : true)
      );
      return globalEntry && globalEntry.original_price > 0 && globalEntry.original_price !== globalEntry.price
        ? globalEntry.original_price
        : undefined;
    },
    [relevantEntries]
  );

  const getMinNightsForDate = useCallback(
    (date: Date): number => {
      const entry = relevantEntries.find(
        (e) => isSameDay(new Date(e.date + "T00:00:00"), date) && !e.is_blocked
      );
      return entry?.min_nights ?? 1;
    },
    [relevantEntries]
  );

  const getAvailabilityForDate = useCallback(
    (date: Date): number | undefined => {
      const entry = relevantEntries.find(
        (e) => isSameDay(new Date(e.date + "T00:00:00"), date)
      );
      return entry?.available;
    },
    [relevantEntries]
  );

  const isBookedDate = useCallback(
    (date: Date): boolean => {
      return bookings.some(
        (b) => b.checkin && b.checkout && b.checkin <= format(date, "yyyy-MM-dd") && b.checkout > format(date, "yyyy-MM-dd")
      );
    },
    [bookings]
  );

  const isCooldownDate = useCallback(
    (date: Date): boolean => {
      return bookedAndCooldownDates.some((d) => isSameDay(d, date)) && !isBookedDate(date);
    },
    [bookedAndCooldownDates, isBookedDate]
  );

  return {
    customPricing,
    unavailableDates,
    getPriceForDate,
    getOriginalPriceForDate,
    getMinNightsForDate,
    getAvailabilityForDate,
    isBookedDate,
    isCooldownDate,
    cooldownMinutes,
    entries,
    lastFetchedAt,
  };
}
