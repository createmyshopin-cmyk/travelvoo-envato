import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

export default function ProfileScreen() {
  const { tenantId, refresh } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle()
      .then(({ data }) => {
        if (data) { setTenant(data); setOwnerName(data.owner_name || ""); setPhone(data.phone || ""); }
      });
  }, [tenantId]);

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({ owner_name: ownerName, phone }).eq("id", tenantId);
    setSaving(false);
    if (error) Alert.alert("Error", error.message);
    else { Alert.alert("Saved", "Profile updated"); refresh(); }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Profile</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-5">
        <View className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <View>
            <Text className="text-sm text-gray-500 mb-1">Property Name</Text>
            <Text className="text-base font-medium text-gray-900">{tenant?.tenant_name || "—"}</Text>
          </View>
          <View>
            <Text className="text-sm text-gray-500 mb-1">Email</Text>
            <Text className="text-base font-medium text-gray-900">{tenant?.email || "—"}</Text>
          </View>
          <View className="mt-3">
            <Text className="text-sm font-medium text-gray-700 mb-1">Owner Name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>
          <View className="mt-3">
            <Text className="text-sm font-medium text-gray-700 mb-1">Phone</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <TouchableOpacity
            className="bg-primary rounded-xl py-3.5 items-center mt-4"
            onPress={save}
            disabled={saving}
          >
            <Text className="text-white font-semibold">{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
