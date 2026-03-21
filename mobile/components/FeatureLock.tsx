import { View, Text, TouchableOpacity, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useTheme } from "@/context/ThemeContext";

interface FeatureLockProps {
  featureKey: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function FeatureLock({ featureKey, label, description, children }: FeatureLockProps) {
  const { plan, loading } = useSubscriptionGuard();
  const { isDark } = useTheme();

  if (loading) return null;

  const isEnabled = !!(plan?.feature_flags?.[featureKey]);

  if (isEnabled) return <>{children}</>;

  const bg = isDark ? "#030712" : "#ffffff";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textMuted = isDark ? "#94a3b8" : "#475569";

  const defaultDescription = `This advanced feature is exclusive to our Pro and Enterprise tiers. Upgrade your subscription to unlock ${label.toLowerCase()} and more.`;

  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      {/* Lock icon with glow */}
      <View style={{ marginBottom: 28, alignItems: "center" }}>
        <View style={{
          position: "absolute", width: 140, height: 140, borderRadius: 70,
          backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "rgba(22,162,73,0.06)",
        }} />
        <View style={{
          width: 128, height: 128, borderRadius: 64,
          backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "rgba(22,162,73,0.04)",
          borderWidth: 2, borderColor: isDark ? "rgba(22,162,73,0.2)" : "rgba(22,162,73,0.15)",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 56 }}>🔒</Text>
        </View>
      </View>

      {/* Premium badge */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: isDark ? "rgba(22,162,73,0.1)" : "rgba(22,162,73,0.08)",
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16,
      }}>
        <MaterialCommunityIcons name="shield-star-outline" size={14} color="#16a34a" />
        <Text style={{ fontSize: 11, fontWeight: "800", color: "#16a34a", textTransform: "uppercase", letterSpacing: 1.5 }}>
          Premium Feature
        </Text>
      </View>

      {/* Title */}
      <Text style={{
        fontSize: 26, fontWeight: "900", color: textPrimary,
        textAlign: "center", letterSpacing: -0.5, marginBottom: 12, lineHeight: 32,
      }}>
        {label} Not Available
      </Text>

      {/* Description */}
      <Text style={{
        fontSize: 15, color: textMuted, textAlign: "center",
        lineHeight: 22, marginBottom: 32, maxWidth: 320,
      }}>
        {description || defaultDescription}
      </Text>

      {/* Upgrade button */}
      <TouchableOpacity
        onPress={() => router.push("/(admin)/account/billing")}
        style={{
          backgroundColor: "#16a34a", borderRadius: 999,
          paddingVertical: 16, paddingHorizontal: 40,
          width: "100%", maxWidth: 280, alignItems: "center",
          shadowColor: "#16a34a", shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#ffffff" }}>Upgrade Your Plan</Text>
      </TouchableOpacity>

      {/* Compare plans link */}
      <TouchableOpacity
        onPress={() => Linking.openURL("https://easystay.com/pricing")}
        style={{ marginTop: 12, paddingVertical: 12 }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: textMuted }}>Compare All Plans</Text>
      </TouchableOpacity>
    </View>
  );
}
