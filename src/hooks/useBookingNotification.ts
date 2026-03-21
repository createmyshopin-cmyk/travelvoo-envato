import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export type NewBooking = {
  id: string;
  booking_id: string;
  guest_name: string;
  phone?: string;
  email?: string;
  checkin?: string;
  checkout?: string;
  total_price?: number;
  stay_id?: string;
};

// Generates a pleasant 3-note ascending chime using Web Audio API — no audio file needed
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    const t = ctx.currentTime;
    playTone(523.25, t,        0.30, 0.40); // C5
    playTone(659.25, t + 0.15, 0.30, 0.35); // E5
    playTone(783.99, t + 0.30, 0.55, 0.30); // G5

    setTimeout(() => ctx.close(), 1400);
  } catch {
    // Audio not available — silent fail
  }
}

// Haptic vibration pattern: two short pulses then one long (works on mobile & tablet)
function vibrateDevice() {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 60, 100, 60, 250]);
    }
  } catch {
    // Vibration not supported — silent fail
  }
}

/**
 * useBookingNotification
 * Listens for new booking INSERT events via Supabase Realtime.
 * On every new booking it: plays a chime, vibrates the device, shows a toast, and popup.
 * Mount this once in AdminLayout so it's always active across admin pages.
 */
export function useBookingNotification() {
  const { toast } = useToast();
  const [newBooking, setNewBooking] = useState<NewBooking | null>(null);
  // Skip notifications fired during the initial subscription handshake
  const ready = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => { ready.current = true; }, 2000);

    const channel = supabase
      .channel("booking-new-alert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          if (!ready.current) return;

          const booking = payload.new as Record<string, any>;

          playNotificationSound();
          vibrateDevice();

          setNewBooking({
            id: booking.id,
            booking_id: booking.booking_id,
            guest_name: booking.guest_name,
            phone: booking.phone,
            email: booking.email,
            checkin: booking.checkin,
            checkout: booking.checkout,
            total_price: booking.total_price,
            stay_id: booking.stay_id,
          });

          toast({
            title: "New Booking Received!",
            description: `${booking.guest_name ?? "A guest"} — ${booking.booking_id ?? ""}`,
          });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return {
    newBooking,
    clearNewBooking: () => setNewBooking(null),
  };
}
