import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, RefreshControl, TextInput, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

interface Guest {
  phone: string;
  email: string;
  name: string;
  totalBookings: number;
  totalSpend: number;
  lastBooking: string;
  tier: "new" | "returning" | "loyal" | "vip";
}

const TIER_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  returning: "bg-blue-100 text-blue-700",
  loyal: "bg-purple-100 text-purple-700",
  vip: "bg-amber-100 text-amber-700",
};

function getTier(count: number): Guest["tier"] {
  if (count >= 7) return "vip";
  if (count >= 4) return "loyal";
  if (count >= 2) return "returning";
  return "new";
}

export default function GuestsScreen() {
  const { tenantId } = useTenant();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchGuests = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("bookings")
      .select("guest_name, phone, email, total_price, created_at, status")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "checked_in", "checked_out", "pending"]);

    if (!data) { setLoading(false); return; }

    const guestMap: Record<string, Guest> = {};
    data.forEach((b: any) => {
      const key = b.phone || b.email;
      if (!key) return;
      if (!guestMap[key]) {
        guestMap[key] = { phone: b.phone, email: b.email, name: b.guest_name, totalBookings: 0, totalSpend: 0, lastBooking: b.created_at, tier: "new" };
      }
      guestMap[key].totalBookings += 1;
      guestMap[key].totalSpend += b.total_price || 0;
      if (b.created_at > guestMap[key].lastBooking) guestMap[key].lastBooking = b.created_at;
    });

    const list = Object.values(guestMap).map(g => ({ ...g, tier: getTier(g.totalBookings) }));
    list.sort((a, b) => b.totalBookings - a.totalBookings);
    setGuests(list);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchGuests(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await fetchGuests(); setRefreshing(false); };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return !q || g.name?.toLowerCase().includes(q) || g.phone?.includes(q) || g.email?.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Guest Contacts</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 mt-3"
          placeholder="Search guests…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><Text className="text-gray-400">Loading guests…</Text></View>
      ) : (
        <FlashList
          data={filtered}
          
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View className="py-16 items-center"><Text className="text-gray-400">No guests found</Text></View>}
          renderItem={({ item: g }) => (
            <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">{g.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{g.phone}</Text>
                  <Text className="text-xs text-gray-400">{g.email}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {g.totalBookings} booking{g.totalBookings !== 1 ? "s" : ""} · ₹{g.totalSpend.toLocaleString()} spent
                  </Text>
                </View>
                <View className="items-end gap-2">
                  <View className={`rounded-full px-2 py-0.5 ${TIER_COLORS[g.tier]}`}>
                    <Text className={`text-xs font-medium capitalize ${TIER_COLORS[g.tier]?.split(" ")[1]}`}>{g.tier}</Text>
                  </View>
                  {g.phone && (
                    <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${g.phone}`)}>
                      <Text className="text-xs text-green-600 font-medium">💬 WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
