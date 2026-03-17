import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { FeatureLock } from "@/components/FeatureLock";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "@/context/ThemeContext";

interface AnalyticsData {
  total: number;
  confirmed: number;
  revenue: number;
  conversionRate: string;
  avgBookingValue: number;
  weeklyValues: number[];
  topStays: { name: string; bookings: number; revenue: number }[];
}

function MetricCard({ label, value, icon, trend, trendDown, isDark }: {
  label: string; value: string | number; icon: keyof typeof MaterialCommunityIcons.glyphMap;
  trend?: string; trendDown?: boolean; isDark: boolean;
}) {
  const cardBg = isDark ? "#111827" : "#ffffff";
  const borderC = isDark ? "#1f2937" : "#f1f5f9";
  const labelColor = isDark ? "#6b7280" : "#64748b";
  const valueColor = isDark ? "#f9fafb" : "#0f172a";

  return (
    <View style={{ flex: 1, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: borderC, backgroundColor: cardBg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: labelColor, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
        <MaterialCommunityIcons name={icon} size={16} color="#16a34a" />
      </View>
      <Text style={{ fontSize: 24, fontWeight: "800", color: valueColor, letterSpacing: -0.5 }}>{value}</Text>
      {trend && (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6,
          backgroundColor: trendDown ? (isDark ? "rgba(239,68,68,0.1)" : "#fef2f2") : (isDark ? "rgba(22,162,73,0.1)" : "rgba(22,162,73,0.1)"),
          paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-start",
        }}>
          <MaterialCommunityIcons
            name={trendDown ? "trending-down" : "trending-up"}
            size={14}
            color={trendDown ? "#ef4444" : "#16a34a"}
          />
          <Text style={{ fontSize: 11, fontWeight: "700", color: trendDown ? "#ef4444" : "#16a34a" }}>{trend}</Text>
        </View>
      )}
    </View>
  );
}

function MiniChart({ values, isDark }: { values: number[]; isDark: boolean }) {
  if (values.length < 2) return null;

  const w = 480;
  const h = 140;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * step,
    y: h - ((v - min) / range) * (h - 10) - 5,
  }));

  let linePath = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cx1 = points[i - 1].x + step * 0.4;
    const cx2 = points[i].x - step * 0.4;
    linePath += ` C${cx1} ${points[i - 1].y} ${cx2} ${points[i].y} ${points[i].x} ${points[i].y}`;
  }

  const fillPath = linePath + ` L${w} ${h} L0 ${h} Z`;

  return (
    <View style={{ height: 140, marginTop: 8 }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#grad)" />
        <Path d={linePath} stroke="#16a34a" strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function AnalyticsContent() {
  const { tenantId } = useTenant();
  const { isDark } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const bg = isDark ? "#030712" : "#ffffff";
  const cardBg = isDark ? "#111827" : "#ffffff";
  const borderC = isDark ? "#1f2937" : "#f1f5f9";
  const titleColor = isDark ? "#f9fafb" : "#0f172a";
  const subColor = isDark ? "#6b7280" : "#64748b";
  const rowBg = isDark ? "#111827" : "#f8fafc";

  const fetchData = async () => {
    if (!tenantId) return;
    const [bookingsRes, staysRes] = await Promise.all([
      supabase.from("bookings").select("status, total_price, created_at, guest_name, checkin, stay_id").eq("tenant_id", tenantId),
      supabase.from("stays").select("id, name").eq("tenant_id", tenantId),
    ]);

    const bookings = bookingsRes.data || [];
    const staysMap: Record<string, string> = {};
    (staysRes.data || []).forEach((s: any) => { staysMap[s.id] = s.name; });

    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out").length;
    const revenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total_price || 0), 0);
    const conversionRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : "0";
    const avgBookingValue = confirmed > 0 ? Math.round(revenue / confirmed) : 0;

    const now = new Date();
    const weeklyValues: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayRevenue = bookings
        .filter(b => b.created_at?.startsWith(key) && b.status !== "cancelled")
        .reduce((s, b) => s + (b.total_price || 0), 0);
      weeklyValues.push(dayRevenue);
    }

    const stayStats: Record<string, { bookings: number; revenue: number }> = {};
    bookings.forEach(b => {
      if (!b.stay_id || b.status === "cancelled") return;
      if (!stayStats[b.stay_id]) stayStats[b.stay_id] = { bookings: 0, revenue: 0 };
      stayStats[b.stay_id].bookings += 1;
      stayStats[b.stay_id].revenue += b.total_price || 0;
    });
    const topStays = Object.entries(stayStats)
      .map(([id, s]) => ({ name: staysMap[id] || "Unknown", ...s }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setData({ total, confirmed, revenue, conversionRate, avgBookingValue, weeklyValues, topStays });
  };

  useEffect(() => { fetchData(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: subColor }}>Loading…</Text>
      </View>
    );
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Metric Grid 2x2 */}
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <MetricCard label="Total Bookings" value={data.total.toLocaleString("en-IN")} icon="book-open-outline" trend="12%" isDark={isDark} />
          <MetricCard label="Confirmed" value={data.confirmed.toLocaleString("en-IN")} icon="check-circle-outline" trend="8%" isDark={isDark} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <MetricCard label="Revenue" value={`₹${(data.revenue / 1000).toFixed(1)}k`} icon="cash-multiple" trend="15%" isDark={isDark} />
          <MetricCard label="Conv. Rate" value={`${data.conversionRate}%`} icon="swap-horizontal" trend="0.5%" trendDown isDark={isDark} />
        </View>
      </View>

      {/* Chart Card */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: borderC, backgroundColor: cardBg, padding: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: subColor }}>Avg Booking Value</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 30, fontWeight: "800", color: titleColor, letterSpacing: -1 }}>
              ₹{data.avgBookingValue.toLocaleString("en-IN")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 6 }}>
              <MaterialCommunityIcons name="trending-up" size={16} color="#16a34a" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#16a34a" }}>5.4%</Text>
            </View>
          </View>

          <MiniChart values={data.weeklyValues} isDark={isDark} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 8 }}>
            {days.map(d => (
              <Text key={d} style={{ fontSize: 11, fontWeight: "600", color: isDark ? "#4b5563" : "#94a3b8" }}>{d}</Text>
            ))}
          </View>
        </View>
      </View>

      {/* Top Stays */}
      {data.topStays.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: titleColor, marginBottom: 12 }}>Top Stays</Text>
          <View style={{ gap: 10 }}>
            {data.topStays.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 10, backgroundColor: rowBg }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#16a34a" }}>#{i + 1}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: titleColor }}>{s.name}</Text>
                    <Text style={{ fontSize: 12, color: subColor }}>{s.bookings} booking{s.bookings !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#16a34a" }}>₹{(s.revenue / 1000).toFixed(1)}k</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export default function AnalyticsScreen() {
  const { isDark } = useTheme();
  const bg = isDark ? "#030712" : "#ffffff";
  const borderC = isDark ? "#1f2937" : "#f1f5f9";
  const titleColor = isDark ? "#f9fafb" : "#0f172a";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: borderC }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: titleColor, letterSpacing: -0.3 }}>Analytics</Text>
      </View>
      <FeatureLock featureKey="analytics" label="Analytics">
        <AnalyticsContent />
      </FeatureLock>
    </SafeAreaView>
  );
}
