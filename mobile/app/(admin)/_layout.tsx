import { useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Tabs, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { usePendingBookingsCount } from "@/hooks/usePendingBookingsCount";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SubscriptionLockScreen() {
  const { status, isSuspended } = useSubscriptionGuard();
  const isCancelled = status === "cancelled";

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-5xl mb-4">{isSuspended ? "🔒" : "⚠️"}</Text>
      <Text className="text-xl font-bold text-gray-900 text-center mb-2">
        {isSuspended ? "Account Suspended" : isCancelled ? "Subscription Cancelled" : "Subscription Expired"}
      </Text>
      <Text className="text-gray-500 text-center text-sm mb-6">
        {isSuspended
          ? "Your account has been suspended. Please contact support."
          : "Renew your plan to continue using all features."}
      </Text>
      {!isSuspended && (
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 px-8"
          onPress={() => router.push("/(admin)/account/billing")}
        >
          <Text className="text-white font-semibold">Upgrade Your Plan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AdminTabsLayout() {
  const { isExpired, isSuspended, loading } = useSubscriptionGuard();
  const pendingCount = usePendingBookingsCount();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? "bg-gray-950" : "bg-white"}`}>
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  if (isExpired || isSuspended) {
    return <SubscriptionLockScreen />;
  }

  const bottomPadding = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 6);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: isDark ? "#6b7280" : "#9ca3af",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? "rgba(17,24,39,0.95)" : "rgba(255,255,255,0.95)",
          borderTopColor: isDark ? "#1f2937" : "#e5e7eb",
          borderTopWidth: 0.5,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "ticket-confirmation" : "ticket-confirmation-outline"} size={24} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 9, fontWeight: "700", minWidth: 18, height: 18, lineHeight: 18 },
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: "Stays",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "bed" : "bed-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "calendar-month" : "calendar-month-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cog-outline" size={24} color={color} />
          ),
        }}
      />
      {/* Hidden tabs — accessible from More screen */}
      <Tabs.Screen name="guests" options={{ href: null }} />
      <Tabs.Screen name="coupons" options={{ href: null }} />
      <Tabs.Screen name="quotations" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="homepage-categories" options={{ href: null }} />
      <Tabs.Screen name="account/billing" options={{ href: null }} />
      <Tabs.Screen name="account/profile" options={{ href: null }} />
      <Tabs.Screen name="account/usage" options={{ href: null }} />
    </Tabs>
  );
}

export default function AdminLayout() {
  const { tenantId, loading } = useTenant();

  useEffect(() => {
    if (loading) return;
    if (!tenantId) {
      router.replace("/(auth)/login");
    }
  }, [tenantId, loading]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-400">Authenticating…</Text>
      </View>
    );
  }

  if (!tenantId) return null;

  return <AdminTabsLayout />;
}
