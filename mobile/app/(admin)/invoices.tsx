import { useEffect, useState, useCallback } from "react";
import { View, Text, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { FeatureLock } from "@/components/FeatureLock";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

interface Invoice {
  id: string; invoice_id: string; guest_name: string;
  checkin: string | null; checkout: string | null;
  total_price: number; payment_status: string; created_at: string;
}

const PAY_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-600",
};

function InvoicesContent() {
  const { tenantId } = useTenant();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("invoices").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  if (loading) return <View className="flex-1 items-center justify-center"><Text className="text-gray-400">Loading…</Text></View>;

  return (
    <FlashList
      data={invoices}
      
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<View className="py-16 items-center"><Text className="text-gray-400">No invoices yet</Text></View>}
      renderItem={({ item: inv }) => (
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{inv.guest_name}</Text>
              <Text className="text-xs text-gray-400">#{inv.invoice_id}</Text>
              <Text className="text-xs text-gray-500 mt-1">{inv.checkin} → {inv.checkout}</Text>
            </View>
            <View className="items-end">
              <View className={`rounded-full px-2 py-0.5 ${PAY_STATUS_COLORS[inv.payment_status] || "bg-gray-100"}`}>
                <Text className="text-xs font-medium capitalize">{inv.payment_status}</Text>
              </View>
              <Text className="text-sm font-bold text-gray-800 mt-2">₹{inv.total_price?.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

export default function InvoicesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Invoices</Text>
      </View>
      <FeatureLock featureKey="invoice_generator" label="Invoice Generator">
        <InvoicesContent />
      </FeatureLock>
    </SafeAreaView>
  );
}
