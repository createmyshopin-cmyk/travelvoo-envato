import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, RefreshControl, ScrollView,
  Modal, TextInput, Alert, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

interface Stay {
  id: string;
  stay_id: string;
  name: string;
  location: string;
  price: number;
  status: string;
  rating: number;
  reviews_count: number;
  category: string;
}

function StayEditModal({ stay, onClose, onSave }: {
  stay: Stay; onClose: () => void; onSave: (updates: Partial<Stay>) => Promise<void>;
}) {
  const [name, setName] = useState(stay.name);
  const [location, setLocation] = useState(stay.location);
  const [price, setPrice] = useState(String(stay.price));
  const [active, setActive] = useState(stay.status === "active");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name, location, price: Number(price), status: active ? "active" : "inactive" });
    setSaving(false);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
          <Text className="text-lg font-bold text-gray-900">Edit Stay</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-gray-500 text-lg">✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-5 pt-5">
          <View className="space-y-4">
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, State" />
            <Field label="Base Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100 mt-4">
              <Text className="text-sm font-medium text-gray-700">Active (Visible to guests)</Text>
              <Switch value={active} onValueChange={setActive} trackColor={{ true: "#1a73e8" }} />
            </View>
          </View>
          <TouchableOpacity
            className="bg-primary rounded-xl py-3.5 items-center mt-8"
            onPress={handleSave}
            disabled={saving}
          >
            <Text className="text-white font-semibold">{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, value, onChangeText, keyboardType, placeholder }: {
  label: string; value: string; onChangeText: (t: string) => void;
  keyboardType?: any; placeholder?: string;
}) {
  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

export default function StaysScreen() {
  const { tenantId } = useTenant();
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Stay | null>(null);

  const fetchStays = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("stays")
      .select("id, stay_id, name, location, price, status, rating, reviews_count, category")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data) setStays(data as Stay[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchStays(); }, [tenantId]);

  const onRefresh = async () => { setRefreshing(true); await fetchStays(); setRefreshing(false); };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("stays").update({ status: newStatus }).eq("id", id);
    if (error) { Alert.alert("Error", error.message); return; }
    setStays(s => s.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  const saveStay = async (updates: Partial<Stay>) => {
    if (!editing) return;
    const { error } = await supabase.from("stays").update(updates).eq("id", editing.id);
    if (error) { Alert.alert("Error", error.message); return; }
    setStays(s => s.map(x => x.id === editing.id ? { ...x, ...updates } : x));
    setEditing(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Stays</Text>
        <Text className="text-xs text-gray-400">{stays.length} properties</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading stays…</Text>
        </View>
      ) : (
        <FlashList
          data={stays}
          
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="py-16 items-center"><Text className="text-gray-400">No stays yet</Text></View>
          }
          renderItem={({ item: s }) => (
            <TouchableOpacity
              className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm"
              onPress={() => setEditing(s)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">{s.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{s.location}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    ₹{s.price.toLocaleString()}/night · ⭐ {s.rating} ({s.reviews_count})
                  </Text>
                </View>
                <View className="items-end gap-2">
                  <View className={`rounded-full px-2 py-0.5 ${s.status === "active" ? "bg-green-100" : "bg-gray-100"}`}>
                    <Text className={`text-xs font-medium ${s.status === "active" ? "text-green-700" : "text-gray-500"}`}>
                      {s.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="mt-1"
                    onPress={() => toggleStatus(s.id, s.status)}
                  >
                    <Text className="text-xs text-primary font-medium">
                      {s.status === "active" ? "Deactivate" : "Activate"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {editing && (
        <StayEditModal
          stay={editing}
          onClose={() => setEditing(null)}
          onSave={saveStay}
        />
      )}
    </SafeAreaView>
  );
}
