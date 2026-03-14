import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, TextInput, RefreshControl,
  Modal, ScrollView, Linking, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

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
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  checked_in: "bg-blue-100 text-blue-700",
  checked_out: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <View className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[status] || "bg-gray-100"}`}>
      <Text className={`text-xs font-medium capitalize ${STATUS_COLORS[status]?.split(" ")[1] || "text-gray-600"}`}>
        {status.replace("_", " ")}
      </Text>
    </View>
  );
}

function BookingDetailModal({ booking, stayName, onClose, onStatusChange }: {
  booking: Booking; stayName: string; onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
}) {
  const nights = booking.checkin && booking.checkout
    ? Math.ceil((new Date(booking.checkout).getTime() - new Date(booking.checkin).getTime()) / 86400000)
    : 0;

  const statuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
          <Text className="text-lg font-bold text-gray-900">#{booking.booking_id}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-gray-500 text-lg">✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-5 pt-4">
          <StatusBadge status={booking.status} />

          <View className="mt-4 space-y-3">
            <Row label="Guest" value={booking.guest_name} />
            <Row label="Phone" value={booking.phone} />
            <Row label="Email" value={booking.email} />
            <Row label="Stay" value={stayName} />
            <Row label="Check-in" value={booking.checkin || "—"} />
            <Row label="Check-out" value={booking.checkout || "—"} />
            <Row label="Nights" value={`${nights}`} />
            <Row label="Guests" value={`${booking.adults} adults${booking.children ? `, ${booking.children} children` : ""}`} />
            <Row label="Total" value={`₹${booking.total_price.toLocaleString()}`} bold />
            {booking.special_requests && <Row label="Special Requests" value={booking.special_requests} />}
          </View>

          {/* Status change */}
          <Text className="mt-6 mb-2 text-sm font-semibold text-gray-700">Update Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {statuses.map(s => (
              <TouchableOpacity
                key={s}
                className={`rounded-full px-3 py-1.5 border ${booking.status === s ? "border-primary bg-primary" : "border-gray-200 bg-gray-50"}`}
                onPress={() => onStatusChange(booking.id, s)}
              >
                <Text className={`text-xs font-medium capitalize ${booking.status === s ? "text-white" : "text-gray-600"}`}>
                  {s.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* WhatsApp */}
          {booking.phone && (
            <TouchableOpacity
              className="mt-6 bg-green-500 rounded-xl py-3 items-center flex-row justify-center"
              onPress={() => Linking.openURL(`https://wa.me/${booking.phone}`)}
            >
              <Text className="text-white font-semibold">💬  WhatsApp Guest</Text>
            </TouchableOpacity>
          )}

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-50">
      <Text className="text-gray-400 text-sm">{label}</Text>
      <Text className={`text-sm text-gray-800 ${bold ? "font-bold" : ""} max-w-[60%] text-right`}>{value}</Text>
    </View>
  );
}

export default function BookingsScreen() {
  const { tenantId } = useTenant();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stayMap, setStayMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    const [bkRes, stRes] = await Promise.all([
      supabase.from("bookings").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("stays").select("id, name").eq("tenant_id", tenantId),
    ]);
    if (bkRes.data) setBookings(bkRes.data as Booking[]);
    if (stRes.data) {
      const m: Record<string, string> = {};
      stRes.data.forEach((s: any) => { m[s.id] = s.name; });
      setStayMap(m);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetch();
    if (!tenantId) return;
    const ch = supabase
      .channel(`mob-bookings-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `tenant_id=eq.${tenantId}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);

  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-2 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900 mb-3">Bookings</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 mb-3"
          placeholder="Search by name, ID or phone…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pb-1">
            {STATUS_FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                className={`rounded-full px-3 py-1 ${filter === f ? "bg-primary" : "bg-gray-100"}`}
                onPress={() => setFilter(f)}
              >
                <Text className={`text-xs font-medium capitalize ${filter === f ? "text-white" : "text-gray-600"}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading bookings…</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-gray-400">No bookings found</Text>
            </View>
          }
          renderItem={({ item: b }) => (
            <TouchableOpacity
              className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm"
              onPress={() => setSelected(b)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">{b.guest_name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">#{b.booking_id}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {stayMap[b.stay_id ?? ""] || "—"} · {b.checkin} → {b.checkout}
                  </Text>
                </View>
                <View className="items-end">
                  <StatusBadge status={b.status} />
                  <Text className="text-sm font-bold text-gray-800 mt-2">₹{b.total_price.toLocaleString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {selected && (
        <BookingDetailModal
          booking={selected}
          stayName={stayMap[selected.stay_id ?? ""] || "Unknown Stay"}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
        />
      )}
    </SafeAreaView>
  );
}
