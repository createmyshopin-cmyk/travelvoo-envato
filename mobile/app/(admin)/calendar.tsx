import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, Switch, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "@/context/ThemeContext";

interface Stay { id: string; name: string; }
interface PricingEntry {
  id?: string; date: string; price: number;
  available: number; min_nights: number; is_blocked: boolean;
}

function formatDateLong(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" });
}

function DayEditModal({ date, entry, isDark, onClose, onSave }: {
  date: string; entry: PricingEntry | null; isDark: boolean;
  onClose: () => void; onSave: (entry: Omit<PricingEntry, "id">) => Promise<void>;
}) {
  const [price, setPrice] = useState(String(entry?.price ?? 0));
  const [available, setAvailable] = useState(entry?.available ?? 1);
  const [minNights, setMinNights] = useState(entry?.min_nights ?? 1);
  const [blocked, setBlocked] = useState(entry?.is_blocked ?? false);
  const [saving, setSaving] = useState(false);

  const modalBg = isDark ? "bg-gray-950" : "bg-white";
  const cardBorder = isDark ? "border-gray-800" : "border-gray-100";
  const titleColor = isDark ? "text-white" : "text-gray-900";
  const labelColor = isDark ? "text-gray-300" : "text-gray-700";
  const inputBg = isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900";
  const counterBg = isDark ? "bg-gray-800" : "bg-gray-100";
  const counterText = isDark ? "text-gray-300" : "text-gray-600";

  const handleSave = async () => {
    setSaving(true);
    await onSave({ date, price: Number(price), available, min_nights: minNights, is_blocked: blocked });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className={`flex-1 ${modalBg}`}>
        <View className="items-center py-2">
          <View className={`h-1.5 w-12 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        </View>
        <View className={`flex-row items-center justify-between px-5 py-3 border-b ${cardBorder}`}>
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Text className={`text-xl ${isDark ? "text-gray-400" : "text-gray-500"}`}>✕</Text>
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${titleColor}`}>Edit Pricing</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-5 pt-5">
          <View className={`p-4 rounded-xl mb-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Date</Text>
            <Text className={`text-base font-bold mt-1 ${titleColor}`}>{formatDateLong(date)}</Text>
          </View>

          <View className="mb-5">
            <Text className={`text-sm font-semibold ${labelColor} mb-2`}>Price (₹)</Text>
            <TextInput
              className={`border rounded-xl px-4 py-3.5 text-base font-semibold ${inputBg}`}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
            />
          </View>

          <View className={`flex-row items-center justify-between py-4 border-t ${cardBorder}`}>
            <Text className={`text-sm font-semibold ${labelColor}`}>Available Rooms</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity className={`w-9 h-9 rounded-full ${counterBg} items-center justify-center`} onPress={() => setAvailable(Math.max(0, available - 1))}>
                <Text className={`${counterText} font-bold text-lg`}>−</Text>
              </TouchableOpacity>
              <Text className={`text-lg font-bold w-8 text-center ${titleColor}`}>{available}</Text>
              <TouchableOpacity className={`w-9 h-9 rounded-full ${counterBg} items-center justify-center`} onPress={() => setAvailable(available + 1)}>
                <Text className={`${counterText} font-bold text-lg`}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className={`flex-row items-center justify-between py-4 border-t ${cardBorder}`}>
            <Text className={`text-sm font-semibold ${labelColor}`}>Min Nights</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity className={`w-9 h-9 rounded-full ${counterBg} items-center justify-center`} onPress={() => setMinNights(Math.max(1, minNights - 1))}>
                <Text className={`${counterText} font-bold text-lg`}>−</Text>
              </TouchableOpacity>
              <Text className={`text-lg font-bold w-8 text-center ${titleColor}`}>{minNights}</Text>
              <TouchableOpacity className={`w-9 h-9 rounded-full ${counterBg} items-center justify-center`} onPress={() => setMinNights(minNights + 1)}>
                <Text className={`${counterText} font-bold text-lg`}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className={`flex-row justify-between items-center py-4 border-t ${cardBorder}`}>
            <View>
              <Text className={`text-sm font-semibold ${labelColor}`}>Block this date</Text>
              <Text className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>No bookings allowed</Text>
            </View>
            <Switch value={blocked} onValueChange={setBlocked} trackColor={{ true: "#ef4444", false: isDark ? "#374151" : "#e5e7eb" }} />
          </View>

          <TouchableOpacity className="bg-primary rounded-xl py-4 items-center mt-6" onPress={handleSave} disabled={saving}>
            <Text className="text-white font-bold text-base">{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function CalendarScreen() {
  const { tenantId } = useTenant();
  const { isDark } = useTheme();
  const [stays, setStays] = useState<Stay[]>([]);
  const [selectedStay, setSelectedStay] = useState<string>("");
  const [pricing, setPricing] = useState<Record<string, PricingEntry>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  const bg = isDark ? "bg-gray-950" : "bg-white";
  const headerBg = isDark ? "bg-gray-950" : "bg-white";
  const borderColor = isDark ? "border-gray-800" : "border-gray-200";
  const titleColor = isDark ? "text-white" : "text-gray-900";
  const subColor = isDark ? "text-gray-400" : "text-gray-500";
  const calCardBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const tileBg = isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-100";
  const infoCardBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";

  const fetchStays = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("stays").select("id, name").eq("tenant_id", tenantId).eq("status", "active");
    if (data && data.length > 0) {
      setStays(data);
      if (!selectedStay) setSelectedStay(data[0].id);
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

  const todayStr = new Date().toISOString().split("T")[0];

  const markedDates: any = {};
  Object.entries(pricing).forEach(([date, p]) => {
    markedDates[date] = {
      marked: true,
      dotColor: p.is_blocked ? "#ef4444" : "#3b82f6",
      selected: date === selectedDate,
      selectedColor: "#16a34a",
    };
  });
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: "#16a34a" };
  }
  if (todayStr && !markedDates[todayStr]) {
    markedDates[todayStr] = { ...(markedDates[todayStr] || {}), today: true };
  }

  const selectedEntry = selectedDate ? pricing[selectedDate] : null;

  return (
    <SafeAreaView className={`flex-1 ${bg}`}>
      {/* Header */}
      <View className={`${headerBg} px-5 pt-4 pb-3 border-b ${borderColor}`}>
        <Text className={`text-xl font-bold tracking-tight ${titleColor}`}>Calendar</Text>
      </View>

      {/* Stay selector chips */}
      {stays.length > 0 && (
        <View style={{ borderBottomWidth: 1, borderBottomColor: isDark ? "#1f2937" : "#e5e7eb" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", gap: 8 }}
          >
            {stays.map(s => {
              const isActive = selectedStay === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: isActive ? "#16a34a" : isDark ? "#1f2937" : "#ffffff",
                    borderWidth: isActive ? 0 : 1,
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                  }}
                  onPress={() => setSelectedStay(s.id)}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? "#ffffff" : isDark ? "#d1d5db" : "#374151",
                  }}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Calendar widget */}
        <View className={`mx-4 mt-4 rounded-xl border overflow-hidden ${calCardBg}`}>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(m: DateData) => setMonth(m.dateString.substring(0, 7))}
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              todayTextColor: "#16a34a",
              todayDotColor: "#16a34a",
              selectedDayBackgroundColor: "#16a34a",
              selectedDayTextColor: "#ffffff",
              arrowColor: isDark ? "#d1d5db" : "#374151",
              monthTextColor: isDark ? "#f9fafb" : "#111827",
              textMonthFontWeight: "700",
              textMonthFontSize: 16,
              textDayFontWeight: "500",
              textDayFontSize: 14,
              textDayHeaderFontWeight: "700",
              textDayHeaderFontSize: 11,
              dayTextColor: isDark ? "#d1d5db" : "#374151",
              textDisabledColor: isDark ? "#4b5563" : "#d1d5db",
              textSectionTitleColor: isDark ? "#6b7280" : "#9ca3af",
              "stylesheet.calendar.header": {
                dayTextAtIndex0: { color: isDark ? "#6b7280" : "#9ca3af" },
                dayTextAtIndex6: { color: isDark ? "#6b7280" : "#9ca3af" },
              },
            }}
          />
        </View>

        {/* Legend */}
        <View className={`mx-4 mt-4 p-4 rounded-xl border ${calCardBg}`}>
          <View className="flex-row items-center gap-6">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-blue-500" />
              <Text className={`text-xs ${subColor}`}>Custom Price</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-red-500" />
              <Text className={`text-xs ${subColor}`}>Blocked</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 rounded border-2 border-primary" />
              <Text className={`text-xs ${subColor}`}>Today</Text>
            </View>
          </View>
        </View>

        {/* Selected date info card */}
        {selectedDate && (
          <View className={`mx-4 mt-4 p-5 rounded-xl border ${infoCardBg}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View className="flex-row items-start justify-between mb-4">
              <View>
                <Text className={`text-lg font-bold ${titleColor}`}>{formatDateLong(selectedDate)}</Text>
                <Text className={`text-sm font-medium mt-0.5 ${selectedEntry?.is_blocked ? "text-red-500" : "text-primary"}`}>
                  Status: {selectedEntry?.is_blocked ? "Blocked" : "Available"}
                </Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10"
                onPress={() => setEditingDate(selectedDate)}
              >
                <Text className="text-primary text-sm">✏️</Text>
                <Text className="text-sm font-bold text-primary">Edit</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <View className={`flex-1 min-w-[45%] p-3 rounded-lg border ${tileBg}`}>
                <Text className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Price</Text>
                <Text className={`text-lg font-bold ${titleColor}`}>
                  {selectedEntry ? `₹${selectedEntry.price.toLocaleString("en-IN")}` : "—"}
                </Text>
              </View>
              <View className={`flex-1 min-w-[45%] p-3 rounded-lg border ${tileBg}`}>
                <Text className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Availability</Text>
                <Text className={`text-lg font-bold ${titleColor}`}>
                  {selectedEntry ? `${selectedEntry.available} Room${selectedEntry.available !== 1 ? "s" : ""}` : "—"}
                </Text>
              </View>
              <View className={`flex-1 min-w-[45%] p-3 rounded-lg border ${tileBg}`}>
                <Text className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Min. Nights</Text>
                <Text className={`text-lg font-bold ${titleColor}`}>
                  {selectedEntry ? `${selectedEntry.min_nights} Night${selectedEntry.min_nights !== 1 ? "s" : ""}` : "—"}
                </Text>
              </View>
              <View className={`flex-1 min-w-[45%] p-3 rounded-lg border ${tileBg}`}>
                <Text className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Status</Text>
                <Text className={`text-lg font-bold ${selectedEntry?.is_blocked ? "text-red-500" : "text-primary"}`}>
                  {selectedEntry?.is_blocked ? "🔴 Blocked" : "✅ Open"}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="h-28" />
      </ScrollView>

      {/* Edit modal */}
      {editingDate && (
        <DayEditModal
          date={editingDate}
          entry={pricing[editingDate] || null}
          isDark={isDark}
          onClose={() => setEditingDate(null)}
          onSave={saveEntry}
        />
      )}
    </SafeAreaView>
  );
}
