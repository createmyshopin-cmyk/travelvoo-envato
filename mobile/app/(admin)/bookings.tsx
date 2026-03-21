import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, TextInput, RefreshControl,
  Modal, ScrollView, Linking, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationContext";
import { ListSkeleton, FooterSpinner } from "@/components/SkeletonLoader";
import NotificationPanel from "@/components/NotificationPanel";

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  phone: string;
  email: string;
  stay_id: string | null;
  checkin: string | null;
  checkout: string | null;
  rooms: any;
  addons: any;
  total_price: number;
  status: string;
  special_requests: string | null;
  adults: number;
  children: number;
  created_at: string;
}

const STATUS_FILTERS = ["all", "pending", "confirmed", "checked_in", "checked_out", "cancelled"];
const FILTER_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "#fef3c7", text: "#b45309" },
  confirmed:   { bg: "rgba(22,162,73,0.1)", text: "#16a34a" },
  checked_in:  { bg: "#f1f5f9", text: "#475569" },
  checked_out: { bg: "#f1f5f9", text: "#94a3b8" },
  cancelled:   { bg: "#fef2f2", text: "#dc2626" },
};

const CHIP_COLORS: Record<string, { bg: string; darkBg: string; text: string; darkText: string }> = {
  all:         { bg: "#f1f5f9", darkBg: "rgba(22,162,73,0.1)", text: "#475569", darkText: "#d1d5db" },
  pending:     { bg: "#fef9ec", darkBg: "rgba(180,83,9,0.12)",  text: "#b45309", darkText: "#fbbf24" },
  confirmed:   { bg: "rgba(22,162,73,0.08)", darkBg: "rgba(22,162,73,0.12)", text: "#16a34a", darkText: "#4ade80" },
  checked_in:  { bg: "#eff6ff", darkBg: "rgba(59,130,246,0.12)", text: "#2563eb", darkText: "#60a5fa" },
  checked_out: { bg: "#f1f5f9", darkBg: "rgba(148,163,184,0.12)", text: "#64748b", darkText: "#94a3b8" },
  cancelled:   { bg: "#fef2f2", darkBg: "rgba(220,38,38,0.12)", text: "#dc2626", darkText: "#f87171" },
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-600" },
  confirmed: { bg: "bg-primary/10", text: "text-primary" },
  checked_in: { bg: "bg-blue-500/10", text: "text-blue-600" },
  checked_out: { bg: "bg-gray-500/10", text: "text-gray-500" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-500" },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function BookingDetailModal({ booking, stayName, onClose, onStatusChange }: {
  booking: Booking; stayName: string; onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
}) {
  const { isDark } = useTheme();
  const nights = booking.checkin && booking.checkout
    ? Math.ceil((new Date(booking.checkout).getTime() - new Date(booking.checkin).getTime()) / 86400000)
    : 0;

  const statuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];

  const modalBg = isDark ? "bg-gray-950" : "bg-white";
  const sectionBg = isDark ? "bg-gray-900" : "bg-gray-50";
  const cardBorder = isDark ? "border-gray-800" : "border-gray-100";
  const infoBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const titleColor = isDark ? "text-white" : "text-gray-900";
  const subColor = isDark ? "text-gray-400" : "text-gray-500";
  const labelColor = isDark ? "text-gray-500" : "text-gray-400";
  const badge = STATUS_BADGE_STYLES[booking.status] || STATUS_BADGE_STYLES.pending;

  const roomLabel = (() => {
    if (Array.isArray(booking.rooms) && booking.rooms.length > 0) {
      return booking.rooms[0]?.name || booking.rooms[0]?.category || "Room";
    }
    return "";
  })();

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className={`flex-1 ${modalBg}`}>
        {/* Handle bar */}
        <View className="items-center py-2">
          <View className={`h-1.5 w-12 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        </View>

        {/* Header */}
        <View className={`flex-row items-center px-4 py-3 border-b ${cardBorder}`}>
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Text className={`text-xl ${isDark ? "text-gray-400" : "text-gray-500"}`}>✕</Text>
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className={`text-lg font-bold tracking-tight ${titleColor}`}>#{booking.booking_id}</Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${badge.bg}`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${badge.text}`}>
              {STATUS_LABELS[booking.status] || booking.status}
            </Text>
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Guest profile */}
          <View className={`flex-row items-center gap-4 px-6 py-6 border-b ${cardBorder} ${sectionBg}`}>
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center border-2 border-white" style={isDark ? { borderColor: "#374151" } : {}}>
              <Text className="text-3xl">👤</Text>
            </View>
            <View>
              <Text className={`text-lg font-bold ${titleColor}`}>{booking.guest_name}</Text>
              <Text className={`text-sm font-medium ${subColor}`}>Primary Guest</Text>
            </View>
          </View>

          {/* Contact & Stay Info */}
          <View className="px-6 py-5">
            <Text className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${labelColor}`}>
              Contact & Stay Info
            </Text>

            {/* Phone */}
            {booking.phone ? (
              <View className={`flex-row items-center gap-3 p-3 rounded-xl border mb-3 ${infoBg}`}>
                <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                  <Text className="text-primary text-lg">📞</Text>
                </View>
                <View>
                  <Text className={`text-xs ${labelColor}`}>Phone</Text>
                  <Text className={`text-sm font-semibold ${titleColor}`}>{booking.phone}</Text>
                </View>
              </View>
            ) : null}

            {/* Email */}
            {booking.email ? (
              <View className={`flex-row items-center gap-3 p-3 rounded-xl border mb-4 ${infoBg}`}>
                <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                  <Text className="text-primary text-lg">✉️</Text>
                </View>
                <View>
                  <Text className={`text-xs ${labelColor}`}>Email</Text>
                  <Text className={`text-sm font-semibold ${titleColor}`}>{booking.email}</Text>
                </View>
              </View>
            ) : null}

            {/* Stay details card */}
            <View className={`p-4 rounded-xl ${sectionBg}`}>
              <View className="flex-row items-start gap-3">
                <Text className="text-primary text-lg mt-0.5">🏨</Text>
                <View>
                  <Text className={`text-xs ${labelColor}`}>Property</Text>
                  <Text className={`font-bold ${titleColor}`}>{stayName}</Text>
                  {roomLabel ? <Text className={`text-sm ${subColor}`}>{roomLabel}</Text> : null}
                </View>
              </View>

              {/* Check-in / Check-out */}
              <View className={`flex-row mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <View className="flex-1">
                  <Text className={`text-xs uppercase font-bold tracking-wider ${labelColor}`}>Check-in</Text>
                  <Text className={`font-semibold mt-1 ${titleColor}`}>{formatDate(booking.checkin)}</Text>
                  <Text className={`text-xs ${subColor}`}>2:00 PM onwards</Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-xs uppercase font-bold tracking-wider ${labelColor}`}>Check-out</Text>
                  <Text className={`font-semibold mt-1 ${titleColor}`}>{formatDate(booking.checkout)}</Text>
                  <Text className={`text-xs ${subColor}`}>Before 11:00 AM</Text>
                </View>
              </View>

              {/* Nights & Guests */}
              <View className={`flex-row items-center gap-4 mt-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <View className="flex-row items-center gap-1">
                  <Text className={`text-sm ${labelColor}`}>🌙</Text>
                  <Text className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {nights} Night{nights !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className={`text-sm ${labelColor}`}>👥</Text>
                  <Text className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {booking.adults} Adult{booking.adults !== 1 ? "s" : ""}{booking.children ? `, ${booking.children} Child${booking.children !== 1 ? "ren" : ""}` : ""}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment */}
          <View className="px-6 pb-2">
            <View className="flex-row items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <View>
                <Text className={`text-sm font-medium ${subColor}`}>Total Amount Paid</Text>
                <Text className="text-2xl font-bold text-primary">₹{booking.total_price.toLocaleString("en-IN")}</Text>
              </View>
              <Text className="text-3xl text-primary">💳</Text>
            </View>
          </View>

          {/* Special Requests */}
          {booking.special_requests ? (
            <View className="px-6 py-3">
              <View className={`p-4 rounded-xl border ${isDark ? "bg-orange-900/20 border-orange-800/30" : "bg-orange-50 border-orange-100"}`}>
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-orange-500">📝</Text>
                  <Text className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-orange-300" : "text-orange-800"}`}>
                    Special Requests
                  </Text>
                </View>
                <Text className={`text-sm italic ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  "{booking.special_requests}"
                </Text>
              </View>
            </View>
          ) : null}

          {/* Status Update */}
          <View className="px-6 py-4">
            <Text className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${labelColor}`}>
              Update Booking Status
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {statuses.map(s => {
                const isActive = booking.status === s;
                const isCancelled = s === "cancelled";
                let btnStyle = `rounded-full px-4 py-2 border `;
                if (isActive) {
                  btnStyle += "border-primary bg-primary";
                } else if (isCancelled) {
                  btnStyle += isDark ? "border-red-900/30 bg-red-900/20" : "border-red-200 bg-red-50";
                } else {
                  btnStyle += isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white";
                }
                const textStyle = isActive
                  ? "text-white"
                  : isCancelled
                    ? "text-red-600"
                    : isDark ? "text-gray-300" : "text-gray-600";
                return (
                  <TouchableOpacity
                    key={s}
                    className={btnStyle}
                    onPress={() => onStatusChange(booking.id, s)}
                  >
                    <Text className={`text-sm font-semibold ${textStyle}`}>
                      {STATUS_LABELS[s] || s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="h-24" />
        </ScrollView>

        {/* Sticky WhatsApp button */}
        {booking.phone ? (
          <View className={`px-6 py-5 border-t ${cardBorder} ${modalBg}`}>
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-4 rounded-xl"
              style={{ backgroundColor: "#25D366", shadowColor: "#25D366", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}
              onPress={() => Linking.openURL(`https://wa.me/${booking.phone}`)}
            >
              <Text className="text-xl">💬</Text>
              <Text className="text-white font-bold text-base">Message on WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const PAGE_SIZE = 20;

export default function BookingsScreen() {
  const { tenantId } = useTenant();
  const { unreadCount } = useNotifications();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stayMap, setStayMap] = useState<Record<string, { name: string; image: string | null }>>({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchPage = useCallback(async (offset: number, replace: boolean) => {
    if (!tenantId) return;

    const staysPromise = offset === 0
      ? supabase.from("stays").select("id, name, images").eq("tenant_id", tenantId)
      : Promise.resolve({ data: null });

    const bkQuery = supabase
      .from("bookings")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const [bkRes, stRes] = await Promise.all([bkQuery, staysPromise]);

    const newRows = (bkRes.data || []) as Booking[];
    setHasMore(newRows.length === PAGE_SIZE);

    if (replace) {
      setBookings(newRows);
    } else {
      setBookings(prev => [...prev, ...newRows]);
    }

    if (stRes.data) {
      const m: Record<string, { name: string; image: string | null }> = {};
      stRes.data.forEach((s: any) => {
        const imgs = Array.isArray(s.images) ? s.images : [];
        m[s.id] = { name: s.name, image: imgs[0] || null };
      });
      setStayMap(m);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchPage(0, true);
    if (!tenantId) return;
    const ch = supabase
      .channel(`mob-bookings-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `tenant_id=eq.${tenantId}` }, () => fetchPage(0, true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);

  const onRefresh = async () => { setRefreshing(true); await fetchPage(0, true); setRefreshing(false); };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(bookings.length, false);
    setLoadingMore(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { Alert.alert("Error", error.message); return; }
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const filtered = bookings.filter(b => {
    const matchFilter = filter === "all" || b.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || b.guest_name?.toLowerCase().includes(q) || b.booking_id?.toLowerCase().includes(q) || b.phone?.includes(q);
    return matchFilter && matchSearch;
  });

  const { isDark } = useTheme();

  const bg = isDark ? "#030712" : "#f6f8f7";
  const headerBg = isDark ? "rgba(3,7,18,0.8)" : "rgba(255,255,255,0.8)";
  const cardBg = isDark ? "rgba(22,162,73,0.05)" : "#ffffff";
  const cardBorder = isDark ? "rgba(22,162,73,0.1)" : "#f1f5f9";
  const titleColor = isDark ? "#f9fafb" : "#0f172a";
  const subColor = isDark ? "#6b7280" : "#64748b";
  const inputBg = isDark ? "rgba(22,162,73,0.05)" : "#f1f5f9";
  const searchIconColor = isDark ? "#64748b" : "#94a3b8";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ backgroundColor: headerBg, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: titleColor, letterSpacing: -0.5 }}>Bookings</Text>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            activeOpacity={0.7}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(22,162,73,0.1)", alignItems: "center", justifyContent: "center" }}
          >
            <MaterialCommunityIcons name={unreadCount > 0 ? "bell-ring" : "bell-outline"} size={22} color="#16a34a" />
            {unreadCount > 0 && (
              <View style={{
                position: "absolute", top: 2, right: 2,
                minWidth: 18, height: 18, borderRadius: 9,
                backgroundColor: "#ef4444",
                alignItems: "center", justifyContent: "center",
                paddingHorizontal: 4,
                borderWidth: 2, borderColor: isDark ? "#030712" : "#ffffff",
              }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ position: "relative", marginBottom: 12 }}>
          <View style={{ position: "absolute", left: 12, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
            <MaterialCommunityIcons name="magnify" size={20} color={searchIconColor} />
          </View>
          <TextInput
            style={{
              backgroundColor: inputBg,
              borderRadius: 12,
              paddingVertical: 12,
              paddingLeft: 40,
              paddingRight: 16,
              fontSize: 14,
              color: titleColor,
            }}
            placeholder="Search by name, ID or phone…"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
            {STATUS_FILTERS.map(f => {
              const active = filter === f;
              const chip = CHIP_COLORS[f] || CHIP_COLORS.all;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? "#16a34a" : (isDark ? chip.darkBg : chip.bg),
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: active ? "700" : "600",
                    color: active ? "#ffffff" : (isDark ? chip.darkText : chip.text),
                  }}>
                    {FILTER_LABELS[f] || f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <ListSkeleton count={6} />
      ) : (
        <FlashList
          data={filtered}
          estimatedItemSize={160}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <View>
              <FooterSpinner loading={loadingMore} />
              <View style={{ height: 100 }} />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 64, alignItems: "center" }}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={isDark ? "#374151" : "#cbd5e1"} />
              <Text style={{ color: subColor, marginTop: 12, fontSize: 14 }}>No bookings found</Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const isCompleted = b.status === "checked_out" || b.status === "cancelled";
            const badgeColors = STATUS_BADGE_COLORS[b.status] || STATUS_BADGE_COLORS.pending;
            const stayInfo = stayMap[b.stay_id ?? ""];
            const stayName = stayInfo?.name || "—";
            const stayImage = stayInfo?.image || null;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelected(b)}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: 12,
                  padding: 16,
                  marginHorizontal: 16,
                  marginTop: 12,
                  opacity: isCompleted ? 0.6 : 1,
                }}
              >
                {/* Top: Guest name + booking ID + status badge */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: titleColor }}>{b.guest_name}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: subColor, marginTop: 2 }}>#{b.booking_id}</Text>
                  </View>
                  <View style={{
                    backgroundColor: badgeColors.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: badgeColors.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {STATUS_LABELS[b.status] || b.status}
                    </Text>
                  </View>
                </View>

                {/* Bottom: Thumbnail + stay info */}
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  {stayImage ? (
                    <Image
                      source={{ uri: stayImage }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        backgroundColor: isDark ? "#1f2937" : "#f1f5f9",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      backgroundColor: isDark ? "#1f2937" : "#f1f5f9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={28}
                        color={isDark ? "#374151" : "#cbd5e1"}
                      />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#e2e8f0" : "#1e293b" }}>
                      {stayName}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={subColor} />
                      <Text style={{ fontSize: 12, color: subColor }}>
                        {formatDateShort(b.checkin)} → {formatDateShort(b.checkout)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: isCompleted ? subColor : "#16a34a",
                      }}>
                        ₹{b.total_price.toLocaleString("en-IN")}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.5 }}>DETAILS</Text>
                        <MaterialCommunityIcons name="chevron-right" size={14} color="#94a3b8" />
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {selected && (
        <BookingDetailModal
          booking={selected}
          stayName={stayMap[selected.stay_id ?? ""]?.name || "Unknown Stay"}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
        />
      )}

      <NotificationPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationPress={(notif) => {
          setShowNotifications(false);
          if (notif.ref_id && (notif.type === "booking" || notif.type === "booking_status")) {
            const bk = bookings.find((b) => b.id === notif.ref_id);
            if (bk) setSelected(bk);
          }
        }}
      />
    </SafeAreaView>
  );
}
