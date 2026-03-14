import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";

interface FeatureLockProps {
  featureKey: string;
  label: string;
  children: React.ReactNode;
}

export function FeatureLock({ featureKey, label, children }: FeatureLockProps) {
  const { plan, loading } = useSubscriptionGuard();

  if (loading) return null;

  const isEnabled = !!(plan?.feature_flags?.[featureKey]);

  if (!isEnabled) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-5xl mb-4">🔒</Text>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          {label} Not Available
        </Text>
        <Text className="text-gray-500 text-center text-sm mb-6">
          {label} is not included in your current plan. Upgrade to unlock this feature.
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 px-8"
          onPress={() => router.push("/(admin)/account/billing")}
        >
          <Text className="text-white font-semibold">Upgrade Your Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}
