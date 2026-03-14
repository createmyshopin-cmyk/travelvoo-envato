import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FeatureLock } from "@/components/FeatureLock";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

function AnalyticsContent() {
  const { tenantId } = useTenant();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!tenantId) return;
    const { data: bookings } = await supabase
      .from("bookings")
      .select("status, total_price, created_at, guest_name, checkin")
      .eq("tenant_id", tenantId);

    if (!bookings) return;

    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out").length;
    const revenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total_price || 0), 0);
    const conversionRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : "0";
    const avgBookingValue = confirmed > 0 ? Math.round(revenue / confirmed) : 0;

    setData({ total, confirmed, revenue, conversionRate, avgBookingValue });
  };

  useEffect(() => { fetchData(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (!data) return <View className="flex-1 items-center justify-center"><Text className="text-gray-400">Loading…</Text></View>;

  return (
    <ScrollView className="flex-1 px-4 pt-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View className="flex-row gap-3">
        <Tile label="Total Bookings" value={data.total} color="bg-blue-50" />
        <Tile label="Confirmed" value={data.confirmed} color="bg-green-50" />
      </View>
      <View className="flex-row gap-3 mt-3">
        <Tile label="Revenue" value={`₹${data.revenue.toLocaleString()}`} color="bg-amber-50" />
        <Tile label="Conv. Rate" value={`${data.conversionRate}%`} color="bg-purple-50" />
      </View>
      <View className="bg-white rounded-2xl p-4 mt-3">
        <Text className="text-sm text-gray-500">Avg Booking Value</Text>
        <Text className="text-3xl font-bold text-gray-900 mt-1">₹{data.avgBookingValue.toLocaleString()}</Text>
      </View>
      <View className="h-8" />
    </ScrollView>
  );
}

function Tile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View className={`${color} rounded-2xl p-4 flex-1`}>
      <Text className="text-xs text-gray-500 mb-1">{label}</Text>
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Analytics</Text>
      </View>
      <FeatureLock featureKey="analytics" label="Analytics">
        <AnalyticsContent />
      </FeatureLock>
    </SafeAreaView>
  );
}
