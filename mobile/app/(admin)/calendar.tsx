import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, Switch, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

interface Stay { id: string; name: string; }
interface PricingEntry {
  id?: string; date: string; price: number;
  available: number; min_nights: number; is_blocked: boolean;
}

interface DayEditModalProps {
  date: string;
  entry: PricingEntry | null;
  stayId: string;
  onClose: () => void;
  onSave: (entry: Omit<PricingEntry, "id">) => Promise<void>;
}

function DayEditModal({ date, entry, stayId, onClose, onSave }: DayEditModalProps) {
  const [price, setPrice] = useState(String(entry?.price ?? 0));
  const [available, setAvailable] = useState(entry?.available ?? 1);
  const [minNights, setMinNights] = useState(entry?.min_nights ?? 1);
  const [blocked, setBlocked] = useState(entry?.is_blocked ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ date, price: Number(price), available, min_nights: minNights, is_blocked: blocked });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
          <Text className="text-base font-bold text-gray-900">{date}</Text>
          <TouchableOpacity onPress={onClose}><Text className="text-gray-500">✕</Text></TouchableOpacity>
        </View>
        <ScrollView className="flex-1 px-5 pt-5">
          <View className="space-y-5">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Price (₹)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>

            <View className="flex-row items-center justify-between mt-4">
              <Text className="text-sm font-medium text-gray-700">Available Rooms</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  onPress={() => setAvailable(Math.max(0, available - 1))}
                >
                  <Text className="text-gray-600 font-bold">−</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold w-6 text-center">{available}</Text>
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  onPress={() => setAvailable(available + 1)}
                >
                  <Text className="text-gray-600 font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-sm font-medium text-gray-700">Min Nights</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  onPress={() => setMinNights(Math.max(1, minNights - 1))}
                >
                  <Text className="text-gray-600 font-bold">−</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold w-6 text-center">{minNights}</Text>
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                  onPress={() => setMinNights(minNights + 1)}
                >
                  <Text className="text-gray-600 font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-2 py-3 border-t border-gray-100">
              <View>
                <Text className="text-sm font-medium text-gray-700">Block this date</Text>
                <Text className="text-xs text-gray-400">No bookings allowed</Text>
              </View>
              <Switch
                value={blocked}
                onValueChange={setBlocked}
                trackColor={{ true: "#ef4444" }}
              />
            </View>
          </View>

          <TouchableOpacity
            className="bg-primary rounded-xl py-3.5 items-center mt-8"
            onPress={handleSave}
            disabled={saving}
          >
            <Text className="text-white font-semibold">{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function CalendarScreen() {
  const { tenantId } = useTenant();
  const [stays, setStays] = useState<Stay[]>([]);
  const [selectedStay, setSelectedStay] = useState<string>("");
  const [pricing, setPricing] = useState<Record<string, PricingEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  const fetchStays = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("stays").select("id, name").eq("tenant_id", tenantId).eq("status", "active");
    if (data && data.length > 0) {
      setStays(data);
      setSelectedStay(data[0].id);
    }
  }, [tenantId]);

  const fetchPricing = useCallback(async () => {
    if (!selectedStay || !month) return;
    const start = `${month}-01`;
    const end = `${month}-31`;
    const { data } = await supabase
      .from("calendar_pricing")
      .select("*")
      .eq("stay_id", selectedStay)
      .gte("date", start)
      .lte("date", end);
    const map: Record<string, PricingEntry> = {};
    (data || []).forEach((p: any) => { map[p.date] = p; });
    setPricing(map);
  }, [selectedStay, month]);

  useEffect(() => { fetchStays(); }, [tenantId]);
  useEffect(() => { fetchPricing(); }, [selectedStay, month]);

  const saveEntry = async (entry: Omit<PricingEntry, "id">) => {
    if (!tenantId || !selectedStay) return;
    const existing = pricing[entry.date];
    if (existing?.id) {
      await supabase.from("calendar_pricing").update(entry).eq("id", existing.id);
    } else {
      await supabase.from("calendar_pricing").insert({ ...entry, stay_id: selectedStay, tenant_id: tenantId });
    }
    await fetchPricing();
  };

  // Build marked dates for calendar
  const markedDates: any = {};
  Object.entries(pricing).forEach(([date, p]) => {
    markedDates[date] = {
      marked: true,
      dotColor: p.is_blocked ? "#ef4444" : "#1a73e8",
      selected: date === selectedDate,
      selectedColor: "#1a73e8",
    };
  });
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: "#1a73e8" };
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Calendar</Text>
        {stays.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            <View className="flex-row gap-2">
              {stays.map(s => (
                <TouchableOpacity
                  key={s.id}
                  className={`rounded-full px-3 py-1 ${selectedStay === s.id ? "bg-primary" : "bg-gray-100"}`}
                  onPress={() => setSelectedStay(s.id)}
                >
                  <Text className={`text-xs font-medium ${selectedStay === s.id ? "text-white" : "text-gray-600"}`}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <ScrollView className="flex-1">
        <Calendar
          markedDates={markedDates}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          onMonthChange={(m: DateData) => setMonth(m.dateString.substring(0, 7))}
          theme={{
            todayTextColor: "#1a73e8",
            selectedDayBackgroundColor: "#1a73e8",
            arrowColor: "#1a73e8",
          }}
        />

        {/* Legend */}
        <View className="px-4 mt-2 flex-row gap-4">
          <View className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full bg-primary" />
            <Text className="text-xs text-gray-500">Custom price</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <Text className="text-xs text-gray-500">Blocked</Text>
          </View>
        </View>

        {/* Selected date info */}
        {selectedDate && (
          <View className="mx-4 mt-3 bg-white rounded-2xl p-4">
            {pricing[selectedDate] ? (
              <View>
                <Text className="font-semibold text-gray-800">{selectedDate}</Text>
                <View className="mt-2 space-y-1">
                  <Text className="text-sm text-gray-600">Price: ₹{pricing[selectedDate].price}</Text>
                  <Text className="text-sm text-gray-600">Available: {pricing[selectedDate].available}</Text>
                  <Text className="text-sm text-gray-600">Min nights: {pricing[selectedDate].min_nights}</Text>
                  {pricing[selectedDate].is_blocked && (
                    <Text className="text-sm text-red-500 font-medium">🔴 Blocked</Text>
                  )}
                </View>
              </View>
            ) : (
              <Text className="text-gray-400 text-sm">No pricing set for {selectedDate}. Tap "Edit" to set.</Text>
            )}
            <TouchableOpacity
              className="mt-3 bg-primary rounded-xl py-2 items-center"
              onPress={() => {/* modal opens below */}}
            >
              <Text className="text-white font-medium text-sm">Edit {selectedDate}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-8" />
      </ScrollView>

      {selectedDate && (
        <DayEditModal
          date={selectedDate}
          entry={pricing[selectedDate] || null}
          stayId={selectedStay}
          onClose={() => setSelectedDate(null)}
          onSave={saveEntry}
        />
      )}
    </SafeAreaView>
  );
}
