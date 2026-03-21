import { View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useTheme } from "@/context/ThemeContext";

const FEATURE_LABELS: Record<string, string> = {
  invoice_generator: "Invoice generator",
  quotation_generator: "Quotation generator",
  ai_search: "AI-powered search",
  analytics: "Advanced analytics dashboard",
  coupons: "Coupon & discount system",
  reels: "Video reels showcase",
  dynamic_pricing: "Dynamic pricing engine",
  custom_domain: "Custom branding and domains",
};

function ProgressBar({ value, max, isDark }: { value: number; max: number; isDark: boolean }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? "#1f2937" : "#f1f5f9", marginTop: 6 }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: pct > 85 ? "#f59e0b" : "#16a34a", width: `${pct}%` }} />
      </View>
      <Text style={{ fontSize: 11, color: isDark ? "#6b7280" : "#94a3b8", marginTop: 4 }}>
        {pct}% {max === -1 ? "" : "used"}
      </Text>
    </View>
  );
}

export default function BillingScreen() {
  const { loading, status, plan, usage, subscription, daysRemaining, isTrial, isExpired, isActive } = useSubscriptionGuard();
  const { isDark } = useTheme();

  const bg = isDark ? "#030712" : "#ffffff";
  const cardBg = isDark ? "#111827" : "#ffffff";
  const borderC = isDark ? "#1f2937" : "#f1f5f9";
  const textPrimary = isDark ? "#f9fafb" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#64748b";
  const sectionBg = isDark ? "#0f172a" : "#ffffff";

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const statusLabel = isExpired ? "Expired" : isTrial ? "Trial" : isActive ? "Active" : status;
  const statusBg = isExpired ? "rgba(239,68,68,0.1)" : isTrial ? "rgba(245,158,11,0.1)" : "rgba(22,162,73,0.1)";
  const statusText = isExpired ? "#ef4444" : isTrial ? "#f59e0b" : "#16a34a";
  const statusBorder = isExpired ? "rgba(239,68,68,0.2)" : isTrial ? "rgba(245,158,11,0.2)" : "rgba(22,162,73,0.2)";

  const unlimited = (v: number) => v === -1;

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
          Subscription
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Plan Card */}
        <View style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: borderC, backgroundColor: cardBg }}>
          <LinearGradient
            colors={isDark ? ["#064e3b", "#0f766e", "#134e4a"] : ["#14532d", "#15803d", "#166534"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 120 }}
          />
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#16a34a", textTransform: "uppercase", letterSpacing: 1.5 }}>
                  Current Plan
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "900", color: textPrimary, marginTop: 4 }}>
                  {plan?.plan_name || "—"} Plan
                </Text>
              </View>
              <View style={{ backgroundColor: statusBg, borderWidth: 1, borderColor: statusBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: statusText, textTransform: "capitalize" }}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: borderC }}>
              <View>
                <Text style={{ fontSize: 13, color: textSecondary }}>Next billing date</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: textPrimary, marginTop: 2 }}>
                  {subscription?.renewal_date ? formatDate(subscription.renewal_date) : "—"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://easystay.com/pricing")}
                style={{
                  backgroundColor: "#16a34a", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
                  shadowColor: "#16a34a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Usage Limits */}
        {plan && (
          <View style={{ marginTop: 24, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: textPrimary }}>Usage Limits</Text>

            {/* Stays */}
            <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: borderC, backgroundColor: sectionBg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.08)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="home-city-outline" size={20} color="#16a34a" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>Properties</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary }}>
                  {usage?.stays_created ?? 0} / {unlimited(plan.max_stays) ? "∞" : plan.max_stays}
                </Text>
              </View>
              {!unlimited(plan.max_stays) && <ProgressBar value={usage?.stays_created ?? 0} max={plan.max_stays} isDark={isDark} />}
            </View>

            {/* Rooms */}
            <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: borderC, backgroundColor: sectionBg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.08)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="bed-outline" size={20} color="#16a34a" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>Rooms</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary }}>
                  {usage?.rooms_created ?? 0} / {unlimited(plan.max_rooms) ? "∞" : plan.max_rooms}
                </Text>
              </View>
              {!unlimited(plan.max_rooms) && <ProgressBar value={usage?.rooms_created ?? 0} max={plan.max_rooms} isDark={isDark} />}
            </View>

            {/* Bookings */}
            <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: borderC, backgroundColor: sectionBg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.08)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#16a34a" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>Bookings / Month</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary }}>
                  {usage?.bookings_this_month ?? 0} / {unlimited(plan.max_bookings_per_month) ? "∞" : plan.max_bookings_per_month}
                </Text>
              </View>
              {!unlimited(plan.max_bookings_per_month) && <ProgressBar value={usage?.bookings_this_month ?? 0} max={plan.max_bookings_per_month} isDark={isDark} />}
            </View>
          </View>
        )}

        {/* Included Features */}
        {plan?.feature_flags && (
          <View style={{ marginTop: 24, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: textPrimary }}>Included Features</Text>
            <View style={{ gap: 4 }}>
              {Object.entries(plan.feature_flags as Record<string, boolean>).map(([key, enabled]) => (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                  <MaterialCommunityIcons
                    name={enabled ? "check-circle" : "close-circle-outline"}
                    size={22}
                    color={enabled ? "#16a34a" : (isDark ? "#374151" : "#d1d5db")}
                  />
                  <Text style={{
                    fontSize: 14, fontWeight: "500",
                    color: enabled ? (isDark ? "#d1d5db" : "#374151") : (isDark ? "#4b5563" : "#9ca3af"),
                    textDecorationLine: enabled ? "none" : "line-through",
                  }}>
                    {FEATURE_LABELS[key] || key.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Price */}
        {plan && (
          <View style={{
            marginTop: 24, padding: 16, borderRadius: 14,
            backgroundColor: isDark ? "rgba(22,162,73,0.06)" : "#f0fdf4",
            borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7",
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: textSecondary }}>Monthly cost</Text>
              <Text style={{ fontSize: 28, fontWeight: "900", color: "#16a34a", marginTop: 2 }}>
                ₹{plan.price.toLocaleString("en-IN")}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "500", color: textSecondary }}>per month</Text>
          </View>
        )}
      </ScrollView>
      )}

      {/* Sticky Upgrade Button */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: bg, borderTopWidth: 1, borderTopColor: borderC,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32,
      }}>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://easystay.com/pricing")}
          style={{
            backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            shadowColor: "#16a34a", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
          }}
        >
          <MaterialCommunityIcons name="rocket-launch-outline" size={20} color="#ffffff" />
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#ffffff" }}>Upgrade Your Plan</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: "center", fontSize: 12, color: textSecondary, marginTop: 10 }}>
          Cancel or switch plans anytime
        </Text>
      </View>
    </SafeAreaView>
  );
}
