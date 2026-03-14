import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

export default function BillingScreen() {
  const { status, plan, daysRemaining, isTrial, isExpired, isActive } = useSubscriptionGuard();

  const statusColor = isExpired ? "text-red-600" : isTrial ? "text-amber-600" : isActive ? "text-green-600" : "text-gray-600";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Subscription</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Current plan card */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-sm text-gray-500">Current Plan</Text>
          <Text className="text-2xl font-bold text-gray-900 mt-1">{plan?.plan_name || "—"}</Text>
          <Text className={`text-sm font-medium mt-1 capitalize ${statusColor}`}>{status}</Text>

          {daysRemaining !== null && (
            <View className={`mt-3 rounded-xl px-3 py-2 ${daysRemaining <= 7 ? "bg-red-50" : "bg-blue-50"}`}>
              <Text className={`text-sm font-medium ${daysRemaining <= 7 ? "text-red-600" : "text-blue-700"}`}>
                {daysRemaining > 0
                  ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
                  : "Subscription expired"}
              </Text>
            </View>
          )}

          {plan && (
            <View className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Plan Limits</Text>
              <Row label="Max Stays" value={plan.max_stays === -1 ? "Unlimited" : plan.max_stays} />
              <Row label="Max Rooms" value={plan.max_rooms === -1 ? "Unlimited" : plan.max_rooms} />
              <Row label="Bookings/Month" value={plan.max_bookings_per_month === -1 ? "Unlimited" : plan.max_bookings_per_month} />
              <Row label="Price" value={`₹${plan.price}/${plan.billing_cycle}`} />
            </View>
          )}
        </View>

        {/* Features */}
        {plan?.feature_flags && Object.keys(plan.feature_flags).length > 0 && (
          <View className="bg-white rounded-2xl p-5 mt-3 shadow-sm">
            <Text className="text-sm font-semibold text-gray-700 mb-3">Features</Text>
            {Object.entries(plan.feature_flags).map(([key, enabled]) => (
              <View key={key} className="flex-row justify-between items-center py-1.5">
                <Text className="text-sm text-gray-600 capitalize">{key.replace(/_/g, " ")}</Text>
                <Text className={enabled ? "text-green-600" : "text-gray-300"}>{enabled ? "✓" : "✗"}</Text>
              </View>
            ))}
          </View>
        )}

        {(isExpired || isTrial) && (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center mt-4"
            onPress={() => Linking.openURL("https://easystay.com/pricing")}
          >
            <Text className="text-white font-bold text-base">Upgrade Your Plan</Text>
          </TouchableOpacity>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <View className="flex-row justify-between py-1.5 border-b border-gray-50">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-800">{String(value)}</Text>
    </View>
  );
}
