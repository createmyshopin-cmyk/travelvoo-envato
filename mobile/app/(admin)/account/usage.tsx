import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

function Bar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const danger = pct > 80;
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-gray-700">{label}</Text>
        <Text className="text-sm font-medium text-gray-800">{used} / {max === -1 ? "∞" : max}</Text>
      </View>
      <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${max === -1 ? 0 : pct}%` }}
        />
      </View>
    </View>
  );
}

export default function UsageScreen() {
  const { usage, plan } = useSubscriptionGuard();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Usage</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          {usage && plan ? (
            <>
              <Bar used={usage.stays_created || 0} max={plan.max_stays} label="Stays" />
              <Bar used={usage.rooms_created || 0} max={plan.max_rooms} label="Rooms" />
              <Bar used={usage.bookings_this_month || 0} max={plan.max_bookings_per_month} label="Bookings this month" />
              <Bar used={usage.ai_search_count || 0} max={plan.max_ai_search} label="AI Searches" />
            </>
          ) : (
            <Text className="text-gray-400 text-center py-4">No usage data available</Text>
          )}
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
