import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { FeatureLock } from "@/components/FeatureLock";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

interface Quotation {
  id: string; quote_id: string; guest_name: string; phone: string;
  email: string; checkin: string | null; checkout: string | null;
  total_price: number; status: string; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

function QuotationsContent() {
  const { tenantId } = useTenant();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("quotations").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setQuotations(data as Quotation[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  if (loading) return <View className="flex-1 items-center justify-center"><Text className="text-gray-400">Loading…</Text></View>;

  return (
    <FlashList
      data={quotations}
      
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<View className="py-16 items-center"><Text className="text-gray-400">No quotations yet</Text></View>}
      renderItem={({ item: q }) => (
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{q.guest_name}</Text>
              <Text className="text-xs text-gray-400">#{q.quote_id}</Text>
              <Text className="text-xs text-gray-500 mt-1">{q.checkin} → {q.checkout}</Text>
            </View>
            <View className="items-end">
              <View className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[q.status] || "bg-gray-100"}`}>
                <Text className="text-xs font-medium capitalize">{q.status}</Text>
              </View>
              <Text className="text-sm font-bold text-gray-800 mt-2">₹{q.total_price?.toLocaleString()}</Text>
              {q.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${q.phone}`)}>
                  <Text className="text-xs text-green-600 mt-1">💬 WA</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    />
  );
}

export default function QuotationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Quotations</Text>
      </View>
      <FeatureLock featureKey="quotation_generator" label="Quotation Generator">
        <QuotationsContent />
      </FeatureLock>
    </SafeAreaView>
  );
}
