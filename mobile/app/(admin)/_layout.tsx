import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Tabs, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { usePendingBookingsCount } from "@/hooks/usePendingBookingsCount";

// Simple icon components (using text glyphs for dependency-free icons)
function Icon({ name, color = "#6b7280", size = 22 }: { name: string; color?: string; size?: number }) {
  const glyphs: Record<string, string> = {
    dashboard: "⊞",
    bookings: "📋",
    stays: "🏨",
    calendar: "📅",
    more: "☰",
  };
  return <Text style={{ fontSize: size, color }}>{glyphs[name] || "•"}</Text>;
}

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  if (isExpired || isSuspended) {
    return <SubscriptionLockScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1a73e8",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Icon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => <Icon name="bookings" color={color} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: "Stays",
          tabBarIcon: ({ color }) => <Icon name="stays" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <Icon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <Icon name="more" color={color} />,
        }}
      />
      {/* Hidden tabs — accessible from More screen */}
      <Tabs.Screen name="guests" options={{ href: null }} />
      <Tabs.Screen name="coupons" options={{ href: null }} />
      <Tabs.Screen name="quotations" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
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
