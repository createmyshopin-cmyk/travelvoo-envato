import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, RefreshControl, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { FeatureLock } from "@/components/FeatureLock";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

interface Coupon {
  id: string; code: string; type: string; value: number;
  active: boolean; usage_count: number; usage_limit: number | null; expires_at: string | null;
}

function CouponsContent() {
  const { tenantId } = useTenant();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCoupons = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("coupons").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchCoupons(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await fetchCoupons(); setRefreshing(false); };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ active: !current }).eq("id", id);
    setCoupons(c => c.map(x => x.id === id ? { ...x, active: !current } : x));
  };

  if (loading) return <View className="flex-1 items-center justify-center"><Text className="text-gray-400">Loading…</Text></View>;

  return (
    <FlashList
      data={coupons}
      
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<View className="py-16 items-center"><Text className="text-gray-400">No coupons yet</Text></View>}
      renderItem={({ item: c }) => (
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base">{c.code}</Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {c.type === "percentage" ? `${c.value}% off` : `₹${c.value} off`}
                {c.usage_limit ? ` · ${c.usage_count}/${c.usage_limit} used` : ` · ${c.usage_count} used`}
              </Text>
              {c.expires_at && <Text className="text-xs text-gray-400">Expires {c.expires_at}</Text>}
            </View>
            <Switch
              value={c.active}
              onValueChange={() => toggleActive(c.id, c.active)}
              trackColor={{ true: "#1a73e8" }}
            />
          </View>
        </View>
      )}
    />
  );
}

export default function CouponsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Coupons</Text>
      </View>
      <FeatureLock featureKey="coupons" label="Coupons">
        <CouponsContent />
      </FeatureLock>
    </SafeAreaView>
  );
}
