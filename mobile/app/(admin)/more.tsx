import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface MenuItem {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  featureKey?: string;
  description: string;
}

const MENU_SECTIONS = [
  {
    title: "Management",
    items: [
      { label: "Guest Contacts", icon: "account-group" as const, route: "/(admin)/guests", description: "Database and communication history" },
      { label: "Analytics", icon: "chart-bar" as const, route: "/(admin)/analytics", featureKey: "analytics", description: "Performance and revenue insights" },
      { label: "Coupons", icon: "tag-outline" as const, route: "/(admin)/coupons", featureKey: "coupons", description: "Manage discounts and promotions" },
      { label: "Quotations", icon: "file-document-outline" as const, route: "/(admin)/quotations", featureKey: "quotation_generator", description: "Create and track price quotes" },
      { label: "Invoices", icon: "receipt" as const, route: "/(admin)/invoices", featureKey: "invoice_generator", description: "Billing and payment history" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", icon: "account-outline" as const, route: "/(admin)/account/profile", description: "Personal details and preferences" },
      { label: "Subscription", icon: "credit-card-outline" as const, route: "/(admin)/account/billing", description: "Manage plan and billing info" },
      { label: "Usage", icon: "chart-donut" as const, route: "/(admin)/account/usage", description: "Track API and storage metrics" },
    ],
  },
];

function MenuRow({ item, isLocked, isDark }: { item: MenuItem; isLocked: boolean; isDark: boolean }) {
  const borderColor = isDark ? "#1f2937" : "#f1f5f9";
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, marginHorizontal: -8, borderBottomWidth: 1, borderBottomColor: borderColor }}
      activeOpacity={0.6}
      onPress={() => router.push(item.route as any)}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
        <MaterialCommunityIcons name={item.icon} size={22} color="#16a34a" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: isLocked ? (isDark ? "#6b7280" : "#9ca3af") : (isDark ? "#f9fafb" : "#0f172a") }}>
          {item.label}
        </Text>
        <Text style={{ fontSize: 12, color: isDark ? "#6b7280" : "#94a3b8", marginTop: 1 }}>
          {item.description}
        </Text>
      </View>
      {isLocked && <Text style={{ fontSize: 14, marginRight: 4 }}>🔒</Text>}
      <Text style={{ fontSize: 20, color: isDark ? "#374151" : "#cbd5e1", fontWeight: "300" }}>›</Text>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { plan } = useSubscriptionGuard();
  const { tenantName } = useTenant();
  const { mode, setMode, isDark } = useTheme();

  const isLocked = (featureKey?: string) => {
    if (!featureKey) return false;
    return !plan?.feature_flags?.[featureKey];
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const toggleNightMode = () => {
    setMode(isDark ? "light" : "dark");
  };

  const bg = isDark ? "#030712" : "#ffffff";
  const sectionTitleColor = "#16a34a";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", borderWidth: 2, borderColor: isDark ? "rgba(22,162,73,0.3)" : "rgba(22,162,73,0.2)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="account" size={30} color="#16a34a" />
            </View>
            <View style={{ backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#16a34a", textTransform: "uppercase", letterSpacing: 1 }}>Admin</Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: isDark ? "#f9fafb" : "#0f172a", letterSpacing: -0.5 }}>More</Text>
            {tenantName && (
              <Text style={{ fontSize: 14, color: isDark ? "#6b7280" : "#64748b", fontWeight: "500", marginTop: 2 }}>{tenantName}</Text>
            )}
          </View>
        </View>

        {/* Menu sections */}
        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: sectionTitleColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
              {section.title}
            </Text>
            <View>
              {section.items.map((item, i) => (
                <MenuRow
                  key={item.route}
                  item={item}
                  isLocked={isLocked(item.featureKey)}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Appearance section */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: sectionTitleColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
            Appearance
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <MaterialCommunityIcons name="weather-night" size={22} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: isDark ? "#f9fafb" : "#0f172a" }}>Night Mode</Text>
              <Text style={{ fontSize: 12, color: isDark ? "#6b7280" : "#94a3b8", marginTop: 1 }}>Easier on the eyes in the dark</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleNightMode}
              trackColor={{ false: isDark ? "#374151" : "#e2e8f0", true: "#16a34a" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
              borderWidth: 1,
              borderColor: isDark ? "rgba(239,68,68,0.15)" : "#fee2e2",
            }}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <MaterialCommunityIcons name="logout" size={20} color={isDark ? "#f87171" : "#dc2626"} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#f87171" : "#dc2626" }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
