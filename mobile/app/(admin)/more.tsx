import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useTenant } from "@/context/TenantContext";

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  featureKey?: string;
  description?: string;
}

const MENU_SECTIONS = [
  {
    title: "Management",
    items: [
      { label: "Guest Contacts", icon: "👥", route: "/(admin)/guests", description: "View & message guests" },
      { label: "Analytics", icon: "📊", route: "/(admin)/analytics", featureKey: "analytics", description: "Booking & revenue insights" },
      { label: "Coupons", icon: "🏷️", route: "/(admin)/coupons", featureKey: "coupons", description: "Discount codes" },
      { label: "Quotations", icon: "📄", route: "/(admin)/quotations", featureKey: "quotation_generator", description: "Guest quotes" },
      { label: "Invoices", icon: "🧾", route: "/(admin)/invoices", featureKey: "invoice_generator", description: "Payment invoices" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", icon: "👤", route: "/(admin)/account/profile", description: "Property & owner info" },
      { label: "Subscription", icon: "💳", route: "/(admin)/account/billing", description: "Plan & billing" },
      { label: "Usage", icon: "📈", route: "/(admin)/account/usage", description: "Limits & quotas" },
    ],
  },
];

function MenuRow({ item, isLocked }: { item: MenuItem; isLocked: boolean }) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-3.5 border-b border-gray-50 active:bg-gray-50"
      onPress={() => router.push(item.route as any)}
    >
      <Text className="text-xl w-9">{item.icon}</Text>
      <View className="flex-1">
        <Text className={`text-base font-medium ${isLocked ? "text-gray-400" : "text-gray-900"}`}>{item.label}</Text>
        {item.description && <Text className="text-xs text-gray-400">{item.description}</Text>}
      </View>
      {isLocked && <Text className="text-sm mr-1">🔒</Text>}
      <Text className="text-gray-300">›</Text>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { plan } = useSubscriptionGuard();
  const { tenantName } = useTenant();

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">More</Text>
        {tenantName && <Text className="text-xs text-gray-400 mt-0.5">{tenantName}</Text>}
      </View>

      <ScrollView className="flex-1">
        {MENU_SECTIONS.map(section => (
          <View key={section.title} className="mt-4">
            <Text className="px-5 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {section.title}
            </Text>
            <View className="bg-white rounded-2xl mx-4 overflow-hidden shadow-sm">
              {section.items.map(item => (
                <MenuRow
                  key={item.route}
                  item={item}
                  isLocked={isLocked(item.featureKey)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <View className="mt-4 mx-4 mb-8">
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center shadow-sm"
            onPress={handleSignOut}
          >
            <Text className="text-red-500 font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
