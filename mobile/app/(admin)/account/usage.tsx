import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useTheme } from "@/context/ThemeContext";

interface UsageCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  used: number;
  max: number;
  isDark: boolean;
  unit?: string;
}

function UsageCard({ icon, label, used, max, isDark, unit = "units" }: UsageCardProps) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
  const isNearLimit = pct >= 80;
  const remaining = unlimited ? null : max - used;

  const cardBg = isNearLimit
    ? (isDark ? "rgba(239,68,68,0.06)" : "rgba(254,242,242,0.6)")
    : (isDark ? "rgba(15,23,42,0.5)" : "#f8fafc");
  const cardBorder = isNearLimit
    ? (isDark ? "rgba(153,27,27,0.3)" : "rgba(254,202,202,1)")
    : (isDark ? "#1e293b" : "#f1f5f9");
  const barBg = isNearLimit
    ? (isDark ? "rgba(153,27,27,0.2)" : "#fee2e2")
    : (isDark ? "#1e293b" : "#e2e8f0");
  const barColor = isNearLimit ? "#dc2626" : "#16a34a";
  const iconColor = isNearLimit ? "#dc2626" : "#16a34a";
  const countColor = isNearLimit
    ? (isDark ? "#f87171" : "#dc2626")
    : (isDark ? "#f9fafb" : "#0f172a");
  const statusColor = isNearLimit ? "#dc2626" : "#16a34a";
  const textPrimary = isDark ? "#f9fafb" : "#0f172a";
  const textMuted = isDark ? "#94a3b8" : "#64748b";

  return (
    <View style={{
      padding: 16, borderRadius: 14,
      backgroundColor: cardBg,
      borderWidth: 1, borderColor: cardBorder,
      gap: 12,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "800", color: countColor }}>
          {used}{unlimited ? "" : `/${max}`}
        </Text>
      </View>

      {/* Progress bar */}
      {!unlimited && (
        <View style={{ height: 10, borderRadius: 5, backgroundColor: barBg, overflow: "hidden" }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: barColor, width: `${pct}%` }} />
        </View>
      )}

      {unlimited ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 12, fontWeight: "500", color: textMuted }}>Unlimited</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: statusColor, textTransform: "uppercase", letterSpacing: 1 }}>
            Unlimited
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {isNearLimit ? (
            <TouchableOpacity onPress={() => Linking.openURL("https://easystay.com/pricing")}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#f87171" : "#b91c1c", textDecorationLine: "underline" }}>
                Upgrade to increase limit
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ fontSize: 12, fontWeight: "500", color: textMuted }}>
              {remaining} {unit} remaining
            </Text>
          )}
          <Text style={{ fontSize: 11, fontWeight: "800", color: statusColor, textTransform: "uppercase", letterSpacing: 1 }}>
            {isNearLimit ? "Near Limit" : "Healthy"}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function UsageScreen() {
  const { loading, usage, plan, daysRemaining } = useSubscriptionGuard();
  const { isDark } = useTheme();

  const bg = isDark ? "#030712" : "#ffffff";
  const textPrimary = isDark ? "#f9fafb" : "#0f172a";
  const textMuted = isDark ? "#94a3b8" : "#64748b";
  const borderC = isDark ? "#1f2937" : "#e2e8f0";

  const nearLimitResources: string[] = [];
  if (plan && usage) {
    if (plan.max_stays !== -1 && plan.max_stays > 0 && (usage.stays_created / plan.max_stays) >= 0.8)
      nearLimitResources.push("Stays");
    if (plan.max_rooms !== -1 && plan.max_rooms > 0 && (usage.rooms_created / plan.max_rooms) >= 0.8)
      nearLimitResources.push("Rooms");
    if (plan.max_bookings_per_month !== -1 && plan.max_bookings_per_month > 0 && (usage.bookings_this_month / plan.max_bookings_per_month) >= 0.8)
      nearLimitResources.push("Bookings");
    if (plan.max_ai_search !== -1 && plan.max_ai_search > 0 && (usage.ai_search_count / plan.max_ai_search) >= 0.8)
      nearLimitResources.push("AI Searches");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: borderC, backgroundColor: bg,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: textPrimary, marginRight: 40 }}>
          Usage
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section title */}
          <Text style={{ fontSize: 22, fontWeight: "800", color: textPrimary, marginTop: 8, marginBottom: 6 }}>
            Resource Limits
          </Text>
          <Text style={{ fontSize: 14, color: textMuted, marginBottom: 20, lineHeight: 20 }}>
            Track your current subscription usage and available capacity.
          </Text>

          {usage && plan ? (
            <View style={{ gap: 16 }}>
              <UsageCard
                icon="home-city-outline"
                label="Stays"
                used={usage.stays_created || 0}
                max={plan.max_stays}
                isDark={isDark}
                unit="units"
              />
              <UsageCard
                icon="bed-outline"
                label="Rooms"
                used={usage.rooms_created || 0}
                max={plan.max_rooms}
                isDark={isDark}
                unit="units"
              />
              <UsageCard
                icon="calendar-check-outline"
                label="Bookings"
                used={usage.bookings_this_month || 0}
                max={plan.max_bookings_per_month}
                isDark={isDark}
                unit="remaining"
              />
              <UsageCard
                icon="creation-outline"
                label="AI Searches"
                used={usage.ai_search_count || 0}
                max={plan.max_ai_search}
                isDark={isDark}
                unit="searches left"
              />
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <MaterialCommunityIcons name="chart-donut" size={48} color={isDark ? "#374151" : "#d1d5db"} />
              <Text style={{ fontSize: 14, color: textMuted, marginTop: 12 }}>No usage data available</Text>
            </View>
          )}

          {/* Summary / billing info */}
          {daysRemaining !== null && daysRemaining > 0 && (
            <View style={{
              marginTop: 24, padding: 16, borderRadius: 12,
              backgroundColor: isDark ? "rgba(22,162,73,0.06)" : "rgba(22,162,73,0.06)",
              borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.2)",
              flexDirection: "row", alignItems: "flex-start", gap: 12,
            }}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#16a34a" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, color: isDark ? "#d1d5db" : "#334155", lineHeight: 20 }}>
                Your billing cycle resets in{" "}
                <Text style={{ fontWeight: "800" }}>{daysRemaining} days</Text>.
                {nearLimitResources.length > 0 && (
                  <>
                    {" "}We recommend upgrading your{" "}
                    <Text style={{ fontWeight: "800" }}>{nearLimitResources.join(", ")}</Text>
                    {" "}quota to avoid service interruption.
                  </>
                )}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
