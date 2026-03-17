import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useTheme } from "@/context/ThemeContext";
import { DashboardSkeleton } from "@/components/SkeletonLoader";

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

interface UpcomingStay {
  guest_name: string;
  checkin: string;
  status: string;
  rooms: any;
  nights: number;
}

const STAT_THEMES = {
  blue: {
    light: "bg-blue-50 border-blue-100",
    dark: "bg-blue-900/20 border-blue-800/50",
    label: { light: "text-blue-700", dark: "text-blue-300" },
    value: { light: "text-blue-900", dark: "text-blue-100" },
    icon: "🛏️",
    iconColor: "text-blue-500",
  },
  purple: {
    light: "bg-purple-50 border-purple-100",
    dark: "bg-purple-900/20 border-purple-800/50",
    label: { light: "text-purple-700", dark: "text-purple-300" },
    value: { light: "text-purple-900", dark: "text-purple-100" },
    icon: "🚪",
    iconColor: "text-purple-500",
  },
  green: {
    light: "bg-green-50 border-green-100",
    dark: "bg-green-900/20 border-green-800/50",
    label: { light: "text-green-700", dark: "text-green-300" },
    value: { light: "text-green-900", dark: "text-green-100" },
    icon: "📋",
    iconColor: "text-green-500",
  },
  amber: {
    light: "bg-amber-50 border-amber-100",
    dark: "bg-amber-900/20 border-amber-800/50",
    label: { light: "text-amber-700", dark: "text-amber-300" },
    value: { light: "text-amber-900", dark: "text-amber-100" },
    icon: "💰",
    iconColor: "text-amber-500",
  },
} as const;

type ThemeKey = keyof typeof STAT_THEMES;

function StatCard({ label, value, sub, theme, isDark }: {
  label: string; value: string | number; sub?: string; theme: ThemeKey; isDark: boolean;
}) {
  const t = STAT_THEMES[theme];
  return (
    <View className={`flex-1 rounded-xl p-4 border ${isDark ? t.dark : t.light}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? t.label.dark : t.label.light}`}>
        {label}
      </Text>
      <View className="flex-row items-end justify-between">
        <View>
          <Text className={`text-3xl font-bold ${isDark ? t.value.dark : t.value.light}`} style={{ lineHeight: 36 }}>
            {value}
          </Text>
          {sub && (
            <View className="flex-row items-center mt-1">
              <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
              <Text className={`text-xs font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>{sub}</Text>
            </View>
          )}
        </View>
        <Text className={`text-2xl ${t.iconColor}`}>{t.icon}</Text>
      </View>
    </View>
  );
}

function getDaysLabel(checkin: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(checkin);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `In ${diff} days`;
}

export default function DashboardScreen() {
  const { tenantId, tenantName } = useTenant();
  const { daysRemaining, isTrial, plan } = useSubscriptionGuard();
  const { isDark } = useTheme();
  const [stats, setStats] = useState<Stats>({ stays: 0, rooms: 0, bookings: 0, revenue: 0, pending: 0, confirmedToday: 0 });
  const [monthly, setMonthly] = useState<MonthData[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!tenantId) return;

    const today = new Date().toISOString().split("T")[0];

    const [staysRes, roomsRes, bookingsRes] = await Promise.all([
      supabase.from("stays").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("room_categories").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("bookings").select("total_price, created_at, status, checkin, checkout, guest_name, rooms").eq("tenant_id", tenantId),
    ]);

    const bookings = bookingsRes.data || [];
    const revenue = bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.total_price || 0), 0);
    const pending = bookings.filter(b => b.status === "pending").length;
    const confirmedToday = bookings.filter(b => b.status === "confirmed" && b.checkin === today).length;

    const upcomingBookings = bookings
      .filter(b => (b.status === "confirmed" || b.status === "pending") && b.checkin && b.checkin >= today)
      .sort((a, b) => (a.checkin || "").localeCompare(b.checkin || ""))
      .slice(0, 5)
      .map(b => {
        const nights = b.checkin && b.checkout
          ? Math.ceil((new Date(b.checkout).getTime() - new Date(b.checkin).getTime()) / 86400000)
          : 1;
        return { guest_name: b.guest_name, checkin: b.checkin, status: b.status, rooms: b.rooms, nights };
      });
    setUpcoming(upcomingBookings);

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

  const bg = isDark ? "bg-gray-950" : "bg-white";
  const headerBg = isDark ? "bg-gray-950" : "bg-white";
  const borderColor = isDark ? "border-gray-800" : "border-gray-100";
  const titleColor = isDark ? "text-white" : "text-gray-900";
  const subtitleColor = isDark ? "text-gray-500" : "text-gray-400";
  const chartCardBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const upcomingBg = isDark ? "bg-gray-900" : "bg-gray-50";

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${bg}`}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${bg}`}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className={`${headerBg} flex-row items-center justify-between px-6 py-5 border-b ${borderColor}`}>
          <Text className={`text-xl font-bold tracking-tight ${titleColor}`}>
            {tenantName || "Dashboard"}
          </Text>
          {isTrial && (
            <View className={`px-3 py-1 rounded-full ${isDark ? "bg-orange-900/30" : "bg-orange-100"}`}>
              <Text className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-orange-400" : "text-orange-700"}`}>
                Trial
              </Text>
            </View>
          )}
          {!isTrial && plan && (
            <View className={`px-3 py-1 rounded-full ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
              <Text className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-green-400" : "text-green-700"}`}>
                {plan.plan_name}
              </Text>
            </View>
          )}
        </View>

        {/* Trial warning */}
        {isTrial && daysRemaining !== null && daysRemaining <= 7 && (
          <View className={`mx-6 mt-4 px-4 py-3 rounded-xl border ${isDark ? "bg-amber-950/50 border-amber-800" : "bg-amber-50 border-amber-200"}`}>
            <Text className={`text-xs font-semibold ${isDark ? "text-amber-400" : "text-amber-700"}`}>
              ⚠️  {daysRemaining > 0 ? `Trial expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}` : "Trial expired"}
            </Text>
          </View>
        )}

        {/* Stats Grid 2×2 */}
        <View className="px-6 pt-6">
          <View className="flex-row gap-4">
            <StatCard label="Total Stays" value={stats.stays} theme="blue" isDark={isDark} />
            <StatCard label="Total Rooms" value={stats.rooms} theme="purple" isDark={isDark} />
          </View>
          <View className="flex-row gap-4 mt-4">
            <StatCard
              label="Total Bookings"
              value={stats.bookings}
              sub={`${stats.pending} pending`}
              theme="green"
              isDark={isDark}
            />
            <StatCard
              label="Revenue"
              value={`₹${stats.revenue.toLocaleString("en-IN")}`}
              theme="amber"
              isDark={isDark}
            />
          </View>
        </View>

        {/* Arrivals Banner */}
        {stats.confirmedToday > 0 && (
          <View className="px-6 mt-6">
            <View className="flex-row items-center justify-between p-4 bg-primary rounded-xl" style={{ shadowColor: "#16a34a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}>
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">🏨</Text>
                <View>
                  <Text className="text-lg font-bold text-white" style={{ lineHeight: 22 }}>
                    {stats.confirmedToday} arrival{stats.confirmedToday !== 1 ? "s" : ""} today
                  </Text>
                  <Text className="text-white/80 text-sm font-medium">Check-in ready</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-white/20 px-4 py-2 rounded-lg"
                onPress={() => router.push("/(admin)/bookings")}
              >
                <Text className="text-white text-sm font-bold">View All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Monthly Bookings Chart */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-5">
            <Text className={`text-xl font-bold ${titleColor}`}>Monthly Bookings</Text>
            <Text className={`text-xs font-semibold uppercase tracking-widest ${subtitleColor}`}>Last 6 Months</Text>
          </View>
          <View className={`p-5 rounded-2xl border ${chartCardBg}`}>
            <View className="flex-row items-end justify-between" style={{ height: 140 }}>
              {monthly.map((m, i) => {
                const barHeight = Math.max(8, (m.bookings / maxBookings) * 120);
                const isLast = i === monthly.length - 1;
                return (
                  <View key={i} className="items-center flex-1 mx-1">
                    <View className="w-full rounded-t-lg bg-primary/20 relative" style={{ height: 120 }}>
                      <View
                        className="absolute bottom-0 w-full bg-primary rounded-t-lg"
                        style={{ height: barHeight }}
                      />
                    </View>
                    <Text className={`text-[10px] font-bold uppercase mt-2 ${isLast ? titleColor : subtitleColor}`}>
                      {m.month}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Upcoming Stays */}
        {upcoming.length > 0 && (
          <View className="px-6 mt-8">
            <Text className={`font-bold text-lg mb-4 ${titleColor}`}>Upcoming Stays</Text>
            <View className="gap-3">
              {upcoming.map((u, i) => {
                const roomLabel = Array.isArray(u.rooms) && u.rooms.length > 0
                  ? (u.rooms[0]?.name || u.rooms[0]?.category || "Room")
                  : "Room";
                return (
                  <View key={i} className={`flex-row items-center gap-3 p-3 rounded-xl ${upcomingBg}`}>
                    <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                      <Text className="text-primary text-lg">👤</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-bold ${titleColor}`}>{u.guest_name}</Text>
                      <Text className={`text-xs ${subtitleColor}`}>{roomLabel} · {u.nights} Night{u.nights !== 1 ? "s" : ""}</Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-xs font-bold ${titleColor}`}>{getDaysLabel(u.checkin)}</Text>
                      <Text className={`text-[10px] font-bold uppercase ${u.status === "confirmed" ? "text-green-600" : "text-amber-600"}`}>
                        {u.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
