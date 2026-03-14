import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

interface Stats {
  stays: number;
  rooms: number;
  bookings: number;
  revenue: number;
  pending: number;
  confirmedToday: number;
}

interface MonthData {
  month: string;
  bookings: number;
  revenue: number;
}

function StatCard({ label, value, sub, color = "bg-blue-50" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <View className={`${color} rounded-2xl p-4 flex-1`}>
      <Text className="text-gray-500 text-xs font-medium mb-1">{label}</Text>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      {sub && <Text className="text-xs text-gray-400 mt-0.5">{sub}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const { tenantId, tenantName } = useTenant();
  const { daysRemaining, isTrial, plan } = useSubscriptionGuard();
  const [stats, setStats] = useState<Stats>({ stays: 0, rooms: 0, bookings: 0, revenue: 0, pending: 0, confirmedToday: 0 });
  const [monthly, setMonthly] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!tenantId) return;

    const today = new Date().toISOString().split("T")[0];

    const [staysRes, roomsRes, bookingsRes] = await Promise.all([
      supabase.from("stays").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("room_categories").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("bookings").select("total_price, created_at, status, checkin").eq("tenant_id", tenantId),
    ]);

    const bookings = bookingsRes.data || [];
    const revenue = bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.total_price || 0), 0);
    const pending = bookings.filter(b => b.status === "pending").length;
    const confirmedToday = bookings.filter(b => b.status === "confirmed" && b.checkin === today).length;

    // Last 6 months
    const months: MonthData[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });
      const monthBookings = bookings.filter(b => b.created_at?.startsWith(key));
      months.push({
        month: label,
        bookings: monthBookings.length,
        revenue: monthBookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.total_price || 0), 0),
      });
    }

    setStats({ stays: staysRes.count ?? 0, rooms: roomsRes.count ?? 0, bookings: bookings.length, revenue, pending, confirmedToday });
    setMonthly(months);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const maxBookings = Math.max(...monthly.map(m => m.bookings), 1);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Loading dashboard…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-white px-5 py-4 border-b border-gray-100">
          <Text className="text-xl font-bold text-gray-900">{tenantName || "Dashboard"}</Text>
          {isTrial && daysRemaining !== null && (
            <View className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <Text className="text-amber-700 text-xs font-medium">
                Trial — {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Expired"}
              </Text>
            </View>
          )}
          {plan && (
            <Text className="text-xs text-gray-400 mt-1">Plan: {plan.plan_name}</Text>
          )}
        </View>

        <View className="px-4 pt-4 space-y-3">
          {/* Stats grid */}
          <View className="flex-row gap-3">
            <StatCard label="Total Stays" value={stats.stays} color="bg-blue-50" />
            <StatCard label="Total Rooms" value={stats.rooms} color="bg-purple-50" />
          </View>
          <View className="flex-row gap-3 mt-3">
            <StatCard label="Total Bookings" value={stats.bookings} sub={`${stats.pending} pending`} color="bg-green-50" />
            <StatCard label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} sub="Confirmed" color="bg-amber-50" />
          </View>

          {/* Today summary */}
          {stats.confirmedToday > 0 && (
            <View className="bg-green-600 rounded-2xl px-4 py-3 mt-3">
              <Text className="text-white text-sm font-semibold">{stats.confirmedToday} arrival{stats.confirmedToday !== 1 ? "s" : ""} today 🏨</Text>
            </View>
          )}

          {/* Monthly chart */}
          <View className="bg-white rounded-2xl p-4 mt-3">
            <Text className="font-semibold text-gray-700 mb-3">Monthly Bookings</Text>
            <View className="flex-row items-end justify-between h-24">
              {monthly.map((m, i) => (
                <View key={i} className="items-center flex-1 mx-0.5">
                  <View
                    className="w-full bg-primary rounded-t-md"
                    style={{ height: Math.max(4, (m.bookings / maxBookings) * 80) }}
                  />
                  <Text className="text-[9px] text-gray-400 mt-1">{m.month}</Text>
                  <Text className="text-[9px] font-medium text-gray-600">{m.bookings}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
