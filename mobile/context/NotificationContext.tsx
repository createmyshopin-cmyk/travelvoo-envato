import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { Vibration, Platform } from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useTenant } from "./TenantContext";

export interface AppNotification {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  type: string;
  ref_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  popup: AppNotification | null;
  dismissPopup: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  popup: null,
  dismissPopup: () => {},
  markAsRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
});

const POPUP_DURATION_MS = 5000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useTenant();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data || []) as AppNotification[]);
    setLoading(false);
  }, [tenantId]);

  const playNotificationAlert = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([0, 200, 100, 200]);
      }
    } catch (_) {}

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/notification.wav"),
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if ("didJustFinish" in status && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (_) {}
  }, []);

  const showPopup = useCallback((notif: AppNotification) => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup(notif);
    popupTimer.current = setTimeout(() => setPopup(null), POPUP_DURATION_MS);
  }, []);

  const dismissPopup = useCallback(() => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup(null);
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (!tenantId) return;

    const channel = supabase
      .channel(`mob-notifications-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          playNotificationAlert();
          showPopup(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (popupTimer.current) clearTimeout(popupTimer.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [tenantId]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!tenantId) return;
    await supabase.from("notifications").update({ read: true }).eq("tenant_id", tenantId).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [tenantId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, popup, dismissPopup, markAsRead, markAllRead, refresh: fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
