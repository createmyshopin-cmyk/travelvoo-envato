import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

interface HomeCategory {
  id: string;
  label: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

const ICON_OPTIONS: (keyof typeof MaterialCommunityIcons.glyphMap)[] = [
  "tag",
  "heart",
  "account-group",
  "star",
  "home",
  "home-city",
  "pine-tree",
  "wave",
  "tent",
  "compass-outline",
  "silverware-fork-knife",
  "sparkles",
];

export default function HomepageCategoriesScreen() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<keyof typeof MaterialCommunityIcons.glyphMap>("tag");

  const bg = isDark ? "#030712" : "#ffffff";
  const cardBg = isDark ? "#111827" : "#ffffff";
  const border = isDark ? "#1f2937" : "#e5e7eb";
  const text = isDark ? "#f9fafb" : "#0f172a";
  const sub = isDark ? "#94a3b8" : "#64748b";

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("stay_categories")
      .select("id, label, icon, sort_order, active")
      .order("sort_order", { ascending: true });
    if (!error) {
      setCategories((data || []) as HomeCategory[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
    const channel = supabase
      .channel("mobile_homepage_categories_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stay_categories" }, fetchCategories)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addCategory = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) {
      Alert.alert("Error", "Tenant not found");
      return;
    }
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0;
    const { error } = await supabase.from("stay_categories").insert({
      tenant_id: tenantId,
      label,
      icon: newIcon,
      sort_order: nextOrder,
      active: true,
    });
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setNewLabel("");
    setNewIcon("tag");
    fetchCategories();
  };

  const renameCategory = async (id: string, currentLabel: string) => {
    const trimmed = currentLabel.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("stay_categories").update({ label: trimmed }).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("stay_categories").update({ active }).eq("id", id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  };

  const deleteCategory = async (id: string) => {
    Alert.alert("Delete category", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("stay_categories").delete().eq("id", id);
          if (error) {
            Alert.alert("Error", error.message);
            return;
          }
          setCategories((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    for (const c of categories) {
      await supabase.from("stay_categories").update({ sort_order: c.sort_order }).eq("id", c.id);
    }
    setSavingOrder(false);
    Alert.alert("Saved", "Category order updated");
  };

  const persistOrder = async (ordered: HomeCategory[]) => {
    for (const c of ordered) {
      await supabase.from("stay_categories").update({ sort_order: c.sort_order }).eq("id", c.id);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  const renderCategoryItem = ({ item, drag, isActive }: RenderItemParams<HomeCategory>) => {
    const iconName = (item.icon || "tag") as keyof typeof MaterialCommunityIcons.glyphMap;
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: border,
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
          backgroundColor: cardBg,
          opacity: item.active ? (isActive ? 0.9 : 1) : 0.65,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPressIn={drag}
            style={{ width: 34, alignItems: "center", justifyContent: "center", paddingVertical: 2 }}
          >
            <MaterialCommunityIcons name="drag" size={20} color={isDark ? "#9ca3af" : "#64748b"} />
          </TouchableOpacity>
          <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)" }}>
            <MaterialCommunityIcons name={iconName} size={18} color="#16a34a" />
          </View>
          <TextInput
            defaultValue={item.label}
            onEndEditing={(e) => renameCategory(item.id, e.nativeEvent.text)}
            style={{ flex: 1, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: text }}
          />
          <Switch
            value={item.active}
            onValueChange={(v) => toggleActive(item.id, v)}
            trackColor={{ false: isDark ? "#374151" : "#cbd5e1", true: "#16a34a" }}
            thumbColor="#ffffff"
          />
          <TouchableOpacity onPress={() => deleteCategory(item.id)} style={{ paddingHorizontal: 4 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={isDark ? "#f87171" : "#dc2626"} />
          </TouchableOpacity>
        </View>
        <Text style={{ marginTop: 8, fontSize: 11, color: sub }}>Icon: {item.icon || "tag"} • Order: {item.sort_order}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <DraggableFlatList
        data={categories}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          const ordered = data.map((c, idx) => ({ ...c, sort_order: idx }));
          setCategories(ordered);
          void persistOrder(ordered);
        }}
        renderItem={renderCategoryItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        ListHeaderComponent={(
          <>
            <View style={{ paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="chevron-left" size={22} color="#16a34a" />
                <Text style={{ color: "#16a34a", fontSize: 14, fontWeight: "700" }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveOrder} style={{ backgroundColor: "#16a34a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, opacity: savingOrder ? 0.7 : 1 }}>
                <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>{savingOrder ? "Saving..." : "Save Order"}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: text }}>Homepage Categories</Text>
              <Text style={{ fontSize: 13, color: sub, marginTop: 4 }}>Press and drag the handle to reorder categories.</Text>
            </View>

            <View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, padding: 12, backgroundColor: cardBg, gap: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: sub, textTransform: "uppercase", letterSpacing: 1 }}>Add Category</Text>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Category name"
                placeholderTextColor={isDark ? "#6b7280" : "#94a3b8"}
                style={{ borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: text, backgroundColor: isDark ? "#0b1220" : "#ffffff" }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setNewIcon(icon)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: newIcon === icon ? "#16a34a" : border,
                      backgroundColor: newIcon === icon ? "rgba(22,163,74,0.14)" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name={icon} size={18} color={newIcon === icon ? "#16a34a" : sub} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={addCategory} disabled={!newLabel.trim()} style={{ alignSelf: "flex-start", backgroundColor: "#16a34a", opacity: newLabel.trim() ? 1 : 0.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={{ paddingVertical: 26, alignItems: "center" }}>
            <Text style={{ color: sub, fontSize: 13 }}>No categories yet.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
