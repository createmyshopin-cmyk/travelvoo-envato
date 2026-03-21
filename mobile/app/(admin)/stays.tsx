import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, RefreshControl, ScrollView,
  Modal, TextInput, Alert, Switch, Image, ActivityIndicator, Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "@/context/ThemeContext";
import { ListSkeleton, FooterSpinner } from "@/components/SkeletonLoader";

interface Stay {
  id: string;
  stay_id: string;
  name: string;
  location: string;
  price: number;
  original_price: number;
  status: string;
  rating: number;
  reviews_count: number;
  category: string;
  images: string[];
  description: string;
  amenities: string[];
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  tenant_id: string | null;
  max_adults: number;
  max_children: number;
  max_pets: number;
}

interface RoomCategory {
  id: string;
  name: string;
  max_guests: number;
  available: number;
  price: number;
  original_price: number;
  amenities: string[];
  images: string[];
  stay_id: string;
  tenant_id: string | null;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  active: boolean;
  category: string;
  description: string;
  image_url: string;
  stay_id: string;
  tenant_id: string | null;
}

interface StayReel {
  id: string;
  stay_id: string;
  title: string;
  thumbnail: string;
  url: string;
  platform: string;
  sort_order: number;
  tenant_id: string | null;
}

const PLATFORMS = ["youtube", "instagram", "facebook", "tiktok"] as const;

interface NearbyPlace {
  id: string;
  stay_id: string;
  name: string;
  image: string;
  distance: string;
  maps_link: string;
  description: string;
  sort_order: number;
  tenant_id: string | null;
}

const ROOM_AMENITIES = [
  "TV", "AC", "Fan", "Kettle", "WiFi", "Geyser", "Wardrobe",
  "Mini Fridge", "Balcony", "Attached Bath", "Room Service", "Safe",
];

const TABS = ["Basic", "Photos", "Rooms", "Add-ons", "Reels", "Nearby", "Reviews", "SEO"] as const;
type TabName = typeof TABS[number];

const CATEGORIES = ["Luxury Resort", "Budget Stay", "Tree House", "Homestay", "Villa", "Apartment", "Cottage"];
const AVAILABLE_AMENITIES = [
  "Free Parking", "Swimming Pool", "Free WiFi", "Breakfast Included",
  "Gym Access", "Spa & Wellness", "24/7 Service", "Air Conditioning",
  "Pet Friendly", "Kitchen", "Hot Tub", "Mountain View",
  "Lake View", "Bonfire", "BBQ Area", "Laundry",
];

function StayEditModal({ stay, isDark, onClose, onSave, isNew }: {
  stay: Stay; isDark: boolean; onClose: () => void; onSave: (updates: Partial<Stay>) => Promise<void>; isNew?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabName>("Basic");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(stay.name);
  const [location, setLocation] = useState(stay.location);
  const [description, setDescription] = useState(stay.description || "");
  const [category, setCategory] = useState(stay.category || CATEGORIES[0]);
  const [status, setStatus] = useState(stay.status || "active");
  const [price, setPrice] = useState(String(stay.price || 0));
  const [originalPrice, setOriginalPrice] = useState(String(stay.original_price || 0));
  const [maxAdults, setMaxAdults] = useState(stay.max_adults ?? 20);
  const [maxChildren, setMaxChildren] = useState(stay.max_children ?? 5);
  const [maxPets, setMaxPets] = useState(stay.max_pets ?? 5);
  const [amenities, setAmenities] = useState<string[]>(stay.amenities || []);
  const [images, setImages] = useState<string[]>(stay.images || []);
  const [uploading, setUploading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const [rooms, setRooms] = useState<RoomCategory[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<RoomCategory | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("room_categories")
        .select("*")
        .eq("stay_id", stay.id)
        .order("name");
      setRooms((data || []) as RoomCategory[]);
      setRoomsLoading(false);
    })();
  }, [stay.id]);

  const saveRoom = async (room: Partial<RoomCategory> & { id?: string }) => {
    if (room.id) {
      const { id, ...updates } = room;
      const { error } = await supabase.from("room_categories").update(updates).eq("id", id);
      if (error) { Alert.alert("Error", error.message); return; }
      setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } as RoomCategory : r));
    } else {
      const { data, error } = await supabase.from("room_categories")
        .insert({ ...room, stay_id: stay.id, tenant_id: stay.tenant_id } as any)
        .select()
        .single();
      if (error) { Alert.alert("Error", error.message); return; }
      if (data) setRooms(prev => [...prev, data as RoomCategory]);
    }
    setEditingRoom(null);
    setAddingRoom(false);
  };

  const deleteRoom = async (id: string) => {
    Alert.alert("Delete Room", "Are you sure you want to delete this room category?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("room_categories").delete().eq("id", id);
          if (error) { Alert.alert("Error", error.message); return; }
          setRooms(prev => prev.filter(r => r.id !== id));
        },
      },
    ]);
  };

  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const addOnsRef = useRef<AddOn[]>([]);
  addOnsRef.current = addOns;
  const [addOnsLoading, setAddOnsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("add_ons")
        .select("*")
        .eq("stay_id", stay.id)
        .order("name");
      setAddOns((data || []) as AddOn[]);
      setAddOnsLoading(false);
    })();
  }, [stay.id]);

  const addNewAddOn = async () => {
    if (!stay.tenant_id) {
      Alert.alert("Error", "Missing tenant. Please reload the stay.");
      return;
    }
    const { data, error } = await supabase.from("add_ons")
      .insert({
        name: "New Add-on",
        price: 0,
        active: false,
        stay_id: stay.id,
        tenant_id: stay.tenant_id,
      })
      .select()
      .single();
    if (error) { Alert.alert("Error", error.message); return; }
    if (data) setAddOns(prev => [...prev, data as AddOn]);
  };

  const updateAddOn = async (id: string, updates: Partial<AddOn>) => {
    setAddOns(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    const { error } = await supabase.from("add_ons").update(updates).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const syncAddOnField = async (id: string, field: keyof AddOn) => {
    const item = addOnsRef.current.find(a => a.id === id);
    if (!item) return;
    const { error } = await supabase.from("add_ons").update({ [field]: item[field] }).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const deleteAddOn = async (id: string) => {
    Alert.alert("Delete Add-on", "Remove this add-on?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("add_ons").delete().eq("id", id);
          if (error) { Alert.alert("Error", error.message); return; }
          setAddOns(prev => prev.filter(a => a.id !== id));
        },
      },
    ]);
  };

  // --- Reels ---
  const [reels, setReels] = useState<StayReel[]>([]);
  const reelsRef = useRef<StayReel[]>([]);
  reelsRef.current = reels;
  const [reelsLoading, setReelsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stay_reels")
        .select("*")
        .eq("stay_id", stay.id)
        .order("sort_order");
      setReels((data || []) as StayReel[]);
      setReelsLoading(false);
    })();
  }, [stay.id]);

  const addNewReel = async () => {
    if (!stay.tenant_id) {
      Alert.alert("Error", "Missing tenant. Please reload the stay.");
      return;
    }
    const { data, error } = await supabase.from("stay_reels")
      .insert({
        title: "New Reel",
        url: "",
        thumbnail: "",
        platform: "youtube",
        sort_order: reels.length,
        stay_id: stay.id,
        tenant_id: stay.tenant_id,
      })
      .select()
      .single();
    if (error) { Alert.alert("Error", error.message); return; }
    if (data) setReels(prev => [...prev, data as StayReel]);
  };

  const updateReel = async (id: string, updates: Partial<StayReel>) => {
    setReels(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const { error } = await supabase.from("stay_reels").update(updates).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const syncReelField = async (id: string, field: keyof StayReel) => {
    const item = reelsRef.current.find(r => r.id === id);
    if (!item) return;
    const { error } = await supabase.from("stay_reels").update({ [field]: item[field] }).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const deleteReel = async (id: string) => {
    Alert.alert("Delete Reel", "Remove this reel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("stay_reels").delete().eq("id", id);
          if (error) { Alert.alert("Error", error.message); return; }
          setReels(prev => prev.filter(r => r.id !== id));
        },
      },
    ]);
  };

  // --- Nearby Places ---
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const nearbyRef = useRef<NearbyPlace[]>([]);
  nearbyRef.current = nearbyPlaces;
  const [nearbyLoading, setNearbyLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("nearby_destinations")
        .select("*")
        .eq("stay_id", stay.id)
        .order("sort_order");
      setNearbyPlaces((data || []) as NearbyPlace[]);
      setNearbyLoading(false);
    })();
  }, [stay.id]);

  const addNearbyPlace = async () => {
    if (!stay.tenant_id) {
      Alert.alert("Error", "Missing tenant. Please reload the stay.");
      return;
    }
    const { data, error } = await supabase.from("nearby_destinations")
      .insert({
        name: "New Place",
        image: "",
        distance: "",
        maps_link: "",
        description: "",
        sort_order: nearbyPlaces.length,
        stay_id: stay.id,
        tenant_id: stay.tenant_id,
      })
      .select()
      .single();
    if (error) { Alert.alert("Error", error.message); return; }
    if (data) setNearbyPlaces(prev => [...prev, data as NearbyPlace]);
  };

  const updateNearbyPlace = async (id: string, updates: Partial<NearbyPlace>) => {
    setNearbyPlaces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const { error } = await supabase.from("nearby_destinations").update(updates).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const syncNearbyField = async (id: string, field: keyof NearbyPlace) => {
    const item = nearbyRef.current.find(p => p.id === id);
    if (!item) return;
    const { error } = await supabase.from("nearby_destinations").update({ [field]: item[field] }).eq("id", id);
    if (error) Alert.alert("Error", error.message);
  };

  const deleteNearbyPlace = async (id: string) => {
    Alert.alert("Delete Place", "Remove this nearby place?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("nearby_destinations").delete().eq("id", id);
          if (error) { Alert.alert("Error", error.message); return; }
          setNearbyPlaces(prev => prev.filter(p => p.id !== id));
        },
      },
    ]);
  };

  const pickNearbyPhoto = async (placeId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert("Error", "Could not read image"); return; }

    const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
    const path = `nearby/${stay.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("stay-images")
      .upload(path, decode(asset.base64), { contentType: `image/${ext}`, upsert: true });
    if (upErr) { Alert.alert("Upload Error", upErr.message); return; }

    const { data: { publicUrl } } = supabase.storage.from("stay-images").getPublicUrl(path);
    updateNearbyPlace(placeId, { image: publicUrl });
  };

  const MAX_PHOTOS = 6;

  const pickAndUpload = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert("Limit reached", `Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - images.length,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    const newUrls: string[] = [];
    for (const asset of result.assets) {
      try {
        if (!asset.base64) continue;
        const ext = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `stays/${fileName}`;
        const mimeType = asset.mimeType || "image/jpeg";

        const { error } = await supabase.storage
          .from("stay-images")
          .upload(path, decode(asset.base64), { contentType: mimeType, upsert: false });

        if (error) { Alert.alert("Upload failed", error.message); continue; }
        const { data: urlData } = supabase.storage.from("stay-images").getPublicUrl(path);
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
      } catch (e: any) {
        Alert.alert("Upload error", e.message || "Something went wrong");
      }
    }
    if (newUrls.length) {
      setImages(prev => {
        const next = [...prev, ...newUrls];
        syncImagesToDb(next);
        return next;
      });
    }
    setUploading(false);
  };

  const syncImagesToDb = useCallback(async (urls: string[]) => {
    await supabase.from("stays").update({ images: urls }).eq("id", stay.id);
  }, [stay.id]);

  const removeImage = (url: string) => {
    setImages(prev => {
      const next = prev.filter(u => u !== url);
      syncImagesToDb(next);
      return next;
    });
  };

  const moveImage = (from: number, to: number) => {
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      syncImagesToDb(next);
      return next;
    });
  };

  const modalBg = isDark ? "#030712" : "#ffffff";
  const inputBg = isDark ? "#1f2937" : "#ffffff";
  const inputBorder = isDark ? "#374151" : "#e2e8f0";
  const inputText = isDark ? "#f9fafb" : "#0f172a";
  const labelText = isDark ? "#94a3b8" : "#64748b";
  const borderC = isDark ? "#1f2937" : "#f1f5f9";
  const tabBarBg = isDark ? "rgba(3,7,18,0.5)" : "rgba(248,250,252,0.5)";
  const chipBg = isDark ? "#1f2937" : "#f8fafc";
  const chipBorder = isDark ? "#374151" : "#f1f5f9";

  const tabIndex = TABS.indexOf(activeTab);

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name, location, description, category, status,
      price: Number(price), original_price: Number(originalPrice),
      amenities, images,
      max_adults: maxAdults, max_children: maxChildren, max_pets: maxPets,
    });
    setSaving(false);
  };

  const goNext = () => {
    const idx = TABS.indexOf(activeTab);
    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
  };
  const goBack = () => {
    const idx = TABS.indexOf(activeTab);
    if (idx > 0) setActiveTab(TABS[idx - 1]);
  };

  const renderBasicTab = () => (
    <View style={{ padding: 24, gap: 20 }}>
      {/* Property Name */}
      <View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Property Name</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: "600", color: inputText, backgroundColor: inputBg }}
          value={name}
          onChangeText={setName}
          placeholderTextColor={isDark ? "#6b7280" : "#94a3b8"}
        />
      </View>

      {/* Location */}
      <View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Location</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: inputText, backgroundColor: inputBg }}
          value={location}
          onChangeText={setLocation}
          placeholderTextColor={isDark ? "#6b7280" : "#94a3b8"}
        />
      </View>

      {/* About */}
      <View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>About</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: inputText, backgroundColor: inputBg, minHeight: 90, textAlignVertical: "top" }}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={isDark ? "#6b7280" : "#94a3b8"}
          placeholder="Describe your property..."
        />
      </View>

      {/* Category + Status row */}
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Category</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: inputBg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text style={{ fontSize: 14, color: inputText, flex: 1 }} numberOfLines={1}>{category}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={labelText} />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, marginTop: 4, backgroundColor: modalBg, overflow: "hidden" }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { setCategory(c); setShowCategoryPicker(false); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c === category ? (isDark ? "#1f2937" : "#f0fdf4") : "transparent" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: c === category ? "700" : "400", color: c === category ? "#16a34a" : inputText }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Status</Text>
          <TouchableOpacity
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: inputBg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text style={{ fontSize: 14, color: inputText }}>{status === "active" ? "Active" : "Inactive"}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={labelText} />
          </TouchableOpacity>
          {showStatusPicker && (
            <View style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, marginTop: 4, backgroundColor: modalBg, overflow: "hidden" }}>
              {["active", "inactive"].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => { setStatus(s); setShowStatusPicker(false); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: s === status ? (isDark ? "#1f2937" : "#f0fdf4") : "transparent" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: s === status ? "700" : "400", color: s === status ? "#16a34a" : inputText, textTransform: "capitalize" }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Pricing Section */}
      <View style={{ backgroundColor: isDark ? "#111827" : "#f9fafb", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? "#1f2937" : "#f1f5f9", gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ padding: 6, borderRadius: 8, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7" }}>
            <MaterialCommunityIcons name="tag-outline" size={16} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: inputText }}>Pricing</Text>
          {Number(originalPrice) > Number(price) && Number(price) > 0 && (
            <View style={{ backgroundColor: "#dc2626", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: "auto" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#ffffff" }}>
                {Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Current Price */}
        <View>
          <Text style={{ fontSize: 10, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Selling Price</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: inputBg, borderWidth: 1.5, borderColor: "#16a34a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#16a34a", marginRight: 4 }}>₹</Text>
            <TextInput
              style={{ flex: 1, fontSize: 22, fontWeight: "900", color: "#16a34a", padding: 0, paddingVertical: 8 }}
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={isDark ? "#374151" : "#d1d5db"}
            />
            <Text style={{ fontSize: 11, fontWeight: "600", color: labelText }}>/night</Text>
          </View>
        </View>

        {/* Original Price */}
        <View>
          <Text style={{ fontSize: 10, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Original Price (MRP)</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#4b5563" : "#94a3b8", marginRight: 4 }}>₹</Text>
            <TextInput
              style={{ flex: 1, fontSize: 18, fontWeight: "700", color: isDark ? "#6b7280" : "#94a3b8", padding: 0, paddingVertical: 8, textDecorationLine: Number(originalPrice) > Number(price) ? "line-through" : "none" }}
              value={originalPrice}
              onChangeText={(t) => setOriginalPrice(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={isDark ? "#374151" : "#d1d5db"}
            />
            <Text style={{ fontSize: 11, fontWeight: "600", color: labelText }}>/night</Text>
          </View>
        </View>
      </View>

      {/* Guest Limits Section */}
      <View style={{ backgroundColor: isDark ? "#111827" : "#f9fafb", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? "#1f2937" : "#f1f5f9", gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ padding: 6, borderRadius: 8, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7" }}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: inputText }}>Guest Limits</Text>
        </View>

        {[
          { label: "Adults", icon: "account" as const, value: maxAdults, setValue: setMaxAdults, min: 1, max: 50 },
          { label: "Children", icon: "human-child" as const, value: maxChildren, setValue: setMaxChildren, min: 1, max: 20 },
          { label: "Pets", icon: "paw" as const, value: maxPets, setValue: setMaxPets, min: 1, max: 10 },
        ].map(g => (
          <View
            key={g.label}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: modalBg, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: isDark ? "#1f2937" : "#e5e7eb",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialCommunityIcons name={g.icon} size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: inputText }}>{g.label}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity
                onPress={() => g.setValue(Math.max(g.min, g.value - 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: isDark ? "#1f2937" : "#f1f5f9",
                  alignItems: "center", justifyContent: "center",
                  opacity: g.value <= g.min ? 0.4 : 1,
                }}
              >
                <MaterialCommunityIcons name="minus" size={16} color={isDark ? "#d1d5db" : "#475569"} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: "800", color: inputText, minWidth: 28, textAlign: "center" }}>{g.value}</Text>
              <TouchableOpacity
                onPress={() => g.setValue(Math.min(g.max, g.value + 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: isDark ? "rgba(22,162,73,0.1)" : "rgba(22,162,73,0.08)",
                  alignItems: "center", justifyContent: "center",
                  opacity: g.value >= g.max ? 0.4 : 1,
                }}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#16a34a" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Amenities */}
      <View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Amenities</Text>

        {amenities.length > 0 && (
          <View style={{ padding: 12, backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "#f0fdf4", borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7", borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#16a34a", textTransform: "uppercase", marginBottom: 8 }}>Selected</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {amenities.map(a => (
                <TouchableOpacity
                  key={a}
                  onPress={() => toggleAmenity(a)}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#16a34a", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#ffffff" }}>{a}</Text>
                  <MaterialCommunityIcons name="close" size={14} color="#ffffff" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {AVAILABLE_AMENITIES.filter(a => !amenities.includes(a)).map(a => (
            <TouchableOpacity
              key={a}
              onPress={() => toggleAmenity(a)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: isDark ? "#374151" : "#e2e8f0", borderRadius: 8, backgroundColor: isDark ? "#111827" : "#ffffff" }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: isDark ? "#d1d5db" : "#475569" }}>+ {a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 140 }} />
    </View>
  );

  const PHOTO_TILE = Math.floor((Dimensions.get("window").width - 16 * 2 - 12 * 2) / 3);

  const renderPhotosTab = () => {
    const emptySlots = Math.max(0, MAX_PHOTOS - images.length);
    return (
      <View style={{ padding: 16, gap: 20 }}>
        {/* Upload area */}
        <TouchableOpacity
          onPress={pickAndUpload}
          disabled={uploading}
          style={{
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: isDark ? "rgba(22,162,73,0.3)" : "#bbf7d0",
            backgroundColor: isDark ? "rgba(22,162,73,0.05)" : "#f0fdf4",
            borderRadius: 12,
            paddingVertical: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {uploading ? (
            <ActivityIndicator size="large" color="#16a34a" />
          ) : (
            <>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#4ade80" : "#15803d" }}>Upload Photos</Text>
              <Text style={{ fontSize: 12, color: isDark ? "rgba(74,222,128,0.6)" : "rgba(22,101,52,0.5)", marginTop: 4 }}>PNG, JPG up to 10MB</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Hint */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MaterialCommunityIcons name="swap-horizontal" size={16} color={isDark ? "#6b7280" : "#94a3b8"} />
          <Text style={{ fontSize: 12, fontWeight: "500", color: isDark ? "#6b7280" : "#94a3b8" }}>
            Use arrows to reorder · First image = Cover
          </Text>
        </View>

        {/* Photo grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {images.map((url, idx) => (
            <View
              key={url}
              style={{
                width: PHOTO_TILE,
                height: PHOTO_TILE + 32,
                borderRadius: 10,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: idx === 0 ? "rgba(22,162,73,0.3)" : (isDark ? "#374151" : "#e2e8f0"),
                backgroundColor: isDark ? "#111827" : "#ffffff",
              }}
            >
              <Image source={{ uri: url }} style={{ width: "100%", height: PHOTO_TILE - 2 }} resizeMode="cover" />
              {/* COVER badge */}
              {idx === 0 && (
                <View style={{
                  position: "absolute", top: 6, left: 6,
                  backgroundColor: "#16a34a",
                  paddingHorizontal: 7, paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#ffffff", letterSpacing: 0.5 }}>COVER</Text>
                </View>
              )}
              {/* Delete button */}
              <TouchableOpacity
                onPress={() => removeImage(url)}
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="close" size={12} color="#ffffff" />
              </TouchableOpacity>
              {/* Reorder arrows */}
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", height: 32, gap: 4 }}>
                <TouchableOpacity
                  disabled={idx === 0}
                  onPress={() => moveImage(idx, idx - 1)}
                  style={{
                    width: 28, height: 24, borderRadius: 4, alignItems: "center", justifyContent: "center",
                    backgroundColor: idx === 0 ? "transparent" : (isDark ? "#1f2937" : "#f1f5f9"),
                    opacity: idx === 0 ? 0.3 : 1,
                  }}
                >
                  <MaterialCommunityIcons name="chevron-left" size={18} color={isDark ? "#9ca3af" : "#64748b"} />
                </TouchableOpacity>
                <Text style={{ fontSize: 10, fontWeight: "700", color: isDark ? "#6b7280" : "#94a3b8" }}>{idx + 1}</Text>
                <TouchableOpacity
                  disabled={idx === images.length - 1}
                  onPress={() => moveImage(idx, idx + 1)}
                  style={{
                    width: 28, height: 24, borderRadius: 4, alignItems: "center", justifyContent: "center",
                    backgroundColor: idx === images.length - 1 ? "transparent" : (isDark ? "#1f2937" : "#f1f5f9"),
                    opacity: idx === images.length - 1 ? 0.3 : 1,
                  }}
                >
                  <MaterialCommunityIcons name="chevron-right" size={18} color={isDark ? "#9ca3af" : "#64748b"} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <TouchableOpacity
              key={`empty-${i}`}
              onPress={pickAndUpload}
              style={{
                width: PHOTO_TILE,
                height: PHOTO_TILE + 32,
                borderRadius: 10,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: isDark ? "#374151" : "#e2e8f0",
                backgroundColor: isDark ? "#111827" : "#f8fafc",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="plus" size={24} color={isDark ? "#4b5563" : "#cbd5e1"} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </View>
    );
  };

  const renderRoomsTab = () => (
    <View style={{ padding: 16, gap: 20 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: inputText }}>
            {rooms.length} room categor{rooms.length !== 1 ? "ies" : "y"}
          </Text>
          <Text style={{ fontSize: 12, color: labelText, marginTop: 2 }}>Manage your stay's inventory</Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddingRoom(true)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: "#16a34a", paddingHorizontal: 16, paddingVertical: 10,
            borderRadius: 999,
          }}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>Add Room</Text>
        </TouchableOpacity>
      </View>

      {roomsLoading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : rooms.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 48 }}>
          <MaterialCommunityIcons name="bed-outline" size={48} color={isDark ? "#374151" : "#cbd5e1"} />
          <Text style={{ fontSize: 14, color: labelText, marginTop: 12 }}>No rooms added yet</Text>
        </View>
      ) : (
        rooms.map(room => {
          const visibleAmenities = room.amenities?.slice(0, 3) || [];
          const extraCount = Math.max(0, (room.amenities?.length || 0) - 3);
          return (
            <View
              key={room.id}
              style={{
                backgroundColor: isDark ? "#111827" : "#ffffff",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDark ? "#1f2937" : "#e2e8f0",
                padding: 16,
                gap: 12,
              }}
            >
              {/* Top row: name + badge + actions */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: inputText, textTransform: "capitalize" }}>{room.name}</Text>
                    <View style={{ backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "#f0fdf4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#16a34a", textTransform: "uppercase", letterSpacing: 0.5 }}>Saved</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MaterialCommunityIcons name="account-outline" size={14} color={labelText} />
                      <Text style={{ fontSize: 12, fontWeight: "500", color: labelText }}>{room.max_guests} guests</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MaterialCommunityIcons name="door-open" size={14} color={labelText} />
                      <Text style={{ fontSize: 12, fontWeight: "500", color: labelText }}>{room.available} available</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setEditingRoom(room)}
                    style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: isDark ? "#1f2937" : "#f8fafc", alignItems: "center", justifyContent: "center" }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={isDark ? "#9ca3af" : "#94a3b8"} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteRoom(room.id)}
                    style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: isDark ? "#1f2937" : "#f8fafc", alignItems: "center", justifyContent: "center" }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={isDark ? "#9ca3af" : "#94a3b8"} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pricing */}
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: inputText }}>₹{room.price.toLocaleString("en-IN")}</Text>
                {room.original_price > room.price && (
                  <Text style={{ fontSize: 13, color: isDark ? "#6b7280" : "#94a3b8", textDecorationLine: "line-through" }}>
                    ₹{room.original_price.toLocaleString("en-IN")}
                  </Text>
                )}
                <Text style={{ fontSize: 10, fontWeight: "600", color: labelText, textTransform: "uppercase" }}>/ night</Text>
              </View>

              {/* Amenity tags */}
              {(visibleAmenities.length > 0 || extraCount > 0) && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {visibleAmenities.map(a => (
                    <View key={a} style={{
                      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
                      backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "#f0fdf4",
                      borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7",
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "500", color: "#16a34a" }}>{a}</Text>
                    </View>
                  ))}
                  {extraCount > 0 && (
                    <View style={{
                      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
                      backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "#f0fdf4",
                      borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7",
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "500", color: "#16a34a" }}>+{extraCount} more</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
      <View style={{ height: 140 }} />
    </View>
  );

  const renderAddOnsTab = () => (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: inputText }}>Add-ons</Text>
          <Text style={{ fontSize: 12, color: labelText, marginTop: 2 }}>Manage extras for your guests.</Text>
        </View>
        <TouchableOpacity
          onPress={addNewAddOn}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: "#16a34a", paddingHorizontal: 16, paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#ffffff" }}>Add</Text>
        </TouchableOpacity>
      </View>

      {addOnsLoading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : addOns.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 48 }}>
          <MaterialCommunityIcons name="puzzle-outline" size={48} color={isDark ? "#374151" : "#cbd5e1"} />
          <Text style={{ fontSize: 14, color: labelText, marginTop: 12 }}>No add-ons yet</Text>
        </View>
      ) : (
        addOns.map((addon, idx) => {
          const isSaved = !!addon.name.trim();
          return (
            <View
              key={addon.id}
              style={{
                backgroundColor: isDark ? "#111827" : "#ffffff",
                borderRadius: 12,
                borderWidth: isSaved ? 1 : 2,
                borderStyle: isSaved ? "solid" : "dashed",
                borderColor: isSaved ? (isDark ? "#1f2937" : "#e2e8f0") : (isDark ? "#374151" : "#e2e8f0"),
                padding: 16,
              }}
            >
              {/* Name + Delete */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Name</Text>
                  <TextInput
                    style={{
                      fontSize: 17, fontWeight: "500", color: inputText, padding: 0,
                      borderBottomWidth: isSaved ? 0 : 1,
                      borderBottomColor: isDark ? "#374151" : "#f1f5f9",
                      paddingBottom: isSaved ? 0 : 4,
                    }}
                    value={addon.name}
                    onChangeText={(t) => setAddOns(prev => prev.map(a => a.id === addon.id ? { ...a, name: t } : a))}
                    onBlur={() => syncAddOnField(addon.id, "name")}
                    placeholder="e.g. Dinner"
                    placeholderTextColor={isDark ? "#4b5563" : "#cbd5e1"}
                  />
                </View>
                <TouchableOpacity onPress={() => deleteAddOn(addon.id)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={isSaved ? "#f87171" : (isDark ? "#4b5563" : "#cbd5e1")} />
                </TouchableOpacity>
              </View>

              {/* Price section */}
              <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "#1f2937" : "#f1f5f9", paddingTop: 12, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1 }}>Price</Text>
                  {/* Optional toggle */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: addon.active ? (isDark ? "#d1d5db" : "#475569") : labelText }}>Optional</Text>
                    <Switch
                      value={addon.active}
                      onValueChange={(v) => updateAddOn(addon.id, { active: v })}
                      trackColor={{ true: "#16a34a", false: isDark ? "#374151" : "#e2e8f0" }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>

                {/* Price input with +/- stepper */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => updateAddOn(addon.id, { price: Math.max(0, addon.price - 50) })}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: isDark ? "#1f2937" : "#f1f5f9",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color={addon.price <= 0 ? (isDark ? "#374151" : "#cbd5e1") : (isDark ? "#d1d5db" : "#475569")} />
                  </TouchableOpacity>

                  <View style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    backgroundColor: isDark ? "#1f2937" : "#f8fafc",
                    borderWidth: 1, borderColor: isDark ? "#374151" : "#e2e8f0",
                    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#6b7280" : "#64748b" }}>₹</Text>
                    <TextInput
                      style={{ fontSize: 18, fontWeight: "800", color: inputText, textAlign: "center", padding: 0, minWidth: 50, marginLeft: 2 }}
                      value={String(addon.price || "")}
                      onChangeText={(t) => setAddOns(prev => prev.map(a => a.id === addon.id ? { ...a, price: Number(t.replace(/[^0-9]/g, "")) || 0 } : a))}
                      onBlur={() => syncAddOnField(addon.id, "price")}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={isDark ? "#4b5563" : "#cbd5e1"}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => updateAddOn(addon.id, { price: addon.price + 50 })}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: isDark ? "rgba(22,162,73,0.1)" : "rgba(22,162,73,0.08)",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#16a34a" />
                  </TouchableOpacity>
                </View>

                {/* Quick price chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[50, 100, 200, 300, 500, 1000].map(p => {
                      const isSelected = addon.price === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => updateAddOn(addon.id, { price: p })}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                            backgroundColor: isSelected ? "#16a34a" : (isDark ? "#1f2937" : "#f1f5f9"),
                            borderWidth: 1,
                            borderColor: isSelected ? "#16a34a" : (isDark ? "#374151" : "#e2e8f0"),
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: isSelected ? "700" : "500", color: isSelected ? "#ffffff" : (isDark ? "#9ca3af" : "#64748b") }}>
                            ₹{p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 140 }} />
    </View>
  );

  const renderReelsTab = () => (
    <View style={{ padding: 20, gap: 20 }}>
      {/* Section intro */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: inputText }}>Reels & Videos</Text>
          <TouchableOpacity
            onPress={addNewReel}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#16a34a", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 }}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>Add Reel</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, color: labelText, marginTop: 4 }}>
          Showcase your property with engaging short videos from YouTube or Instagram.
        </Text>
      </View>

      {reelsLoading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <>
          {reels.map((reel) => {
            const isSaved = reel.title.trim().length > 0;
            return (
              <View
                key={reel.id}
                style={{
                  backgroundColor: isDark ? "#111827" : "#f9fafb",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isDark ? "#1f2937" : "#e5e7eb",
                  padding: 16,
                  gap: 14,
                }}
              >
                {/* Reel header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 }}>
                    <View style={{ padding: 8, borderRadius: 10, backgroundColor: isDark ? "rgba(22,162,73,0.15)" : "#dcfce7" }}>
                      <MaterialCommunityIcons name="video-outline" size={20} color="#16a34a" />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        style={{
                          fontSize: 16, fontWeight: "700", color: inputText, padding: 0,
                        }}
                        value={reel.title}
                        onChangeText={(t) => setReels(prev => prev.map(r => r.id === reel.id ? { ...r, title: t } : r))}
                        onBlur={() => syncReelField(reel.id, "title")}
                        placeholder="Reel title"
                        placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                      />
                      {/* Platform chips */}
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                        {PLATFORMS.map(p => {
                          const active = reel.platform === p;
                          return (
                            <TouchableOpacity
                              key={p}
                              onPress={() => updateReel(reel.id, { platform: p })}
                              style={{
                                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
                                backgroundColor: active ? "#16a34a" : (isDark ? "#1f2937" : "#e5e7eb"),
                              }}
                            >
                              <Text style={{
                                fontSize: 9, fontWeight: "800", color: active ? "#ffffff" : (isDark ? "#9ca3af" : "#6b7280"),
                                textTransform: "uppercase", letterSpacing: 1,
                              }}>
                                {p}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteReel(reel.id)} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={isDark ? "#4b5563" : "#9ca3af"} />
                  </TouchableOpacity>
                </View>

                {/* Video URL */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginLeft: 2 }}>
                    Video URL
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                      fontSize: 14, color: inputText,
                    }}
                    value={reel.url}
                    onChangeText={(t) => setReels(prev => prev.map(r => r.id === reel.id ? { ...r, url: t } : r))}
                    onBlur={() => syncReelField(reel.id, "url")}
                    placeholder="Paste YouTube or Instagram link"
                    placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>

                {/* Thumbnail URL */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginLeft: 2 }}>
                    Thumbnail URL
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                      fontSize: 14, color: inputText,
                    }}
                    value={reel.thumbnail}
                    onChangeText={(t) => setReels(prev => prev.map(r => r.id === reel.id ? { ...r, thumbnail: t } : r))}
                    onBlur={() => syncReelField(reel.id, "thumbnail")}
                    placeholder="Paste image link"
                    placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>

                {/* Thumbnail preview */}
                {reel.thumbnail ? (
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: isDark ? "#4b5563" : "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, marginLeft: 2 }}>
                      Preview
                    </Text>
                    <View style={{
                      borderRadius: 12, overflow: "hidden",
                      backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
                      borderWidth: 1, borderColor: isDark ? "#374151" : "#e5e7eb",
                      aspectRatio: 9 / 16, maxWidth: 200, alignSelf: "center",
                    }}>
                      <Image
                        source={{ uri: reel.thumbnail }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                      <View style={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                        alignItems: "center", justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.2)",
                      }}>
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: "rgba(255,255,255,0.9)",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <MaterialCommunityIcons name="play" size={22} color="#16a34a" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Empty-slot add button */}
          <TouchableOpacity
            onPress={addNewReel}
            style={{
              borderWidth: 2, borderStyle: "dashed",
              borderColor: isDark ? "#374151" : "#e5e7eb",
              borderRadius: 16, paddingVertical: 32,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <View style={{
              padding: 10, borderRadius: 999,
              backgroundColor: isDark ? "#111827" : "#f9fafb",
              marginBottom: 8,
            }}>
              <MaterialCommunityIcons name="plus-circle-outline" size={24} color={isDark ? "#4b5563" : "#9ca3af"} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#4b5563" : "#9ca3af" }}>
              Add another reel
            </Text>
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 140 }} />
    </View>
  );

  const renderNearbyTab = () => (
    <View style={{ padding: 20, gap: 16 }}>
      {/* Header */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: inputText }}>Nearby Places</Text>
          <TouchableOpacity
            onPress={addNearbyPlace}
            style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: isDark ? "rgba(22,162,73,0.1)" : "#f0fdf4",
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
            }}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#16a34a" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Add Place</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, color: labelText, marginTop: 6, lineHeight: 18 }}>
          List popular attractions or landmarks near your property to help guests plan their stay.
        </Text>
      </View>

      {nearbyLoading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <>
          {nearbyPlaces.map((place) => (
            <View
              key={place.id}
              style={{
                backgroundColor: modalBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? "#1f2937" : "#e5e7eb",
                padding: 16,
                gap: 14,
              }}
            >
              {/* Name + distance + delete */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <TextInput
                    style={{ fontSize: 16, fontWeight: "700", color: inputText, padding: 0 }}
                    value={place.name}
                    onChangeText={(t) => setNearbyPlaces(prev => prev.map(p => p.id === place.id ? { ...p, name: t } : p))}
                    onBlur={() => syncNearbyField(place.id, "name")}
                    placeholder="Place name"
                    placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TextInput
                      style={{
                        fontSize: 12, fontWeight: "500", color: isDark ? "#9ca3af" : "#6b7280",
                        backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, padding: 0,
                        minWidth: 60,
                      }}
                      value={place.distance}
                      onChangeText={(t) => setNearbyPlaces(prev => prev.map(p => p.id === place.id ? { ...p, distance: t } : p))}
                      onBlur={() => syncNearbyField(place.id, "distance")}
                      placeholder="e.g. 2 km away"
                      placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    />
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteNearbyPlace(place.id)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={isDark ? "#4b5563" : "#9ca3af"} />
                </TouchableOpacity>
              </View>

              {/* Place Photo */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#9ca3af" : "#374151", marginBottom: 6 }}>Place Photo</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {place.image ? (
                    <View style={{ width: 96, height: 96, borderRadius: 10, overflow: "hidden", backgroundColor: isDark ? "#1f2937" : "#f3f4f6" }}>
                      <Image source={{ uri: place.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    </View>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => pickNearbyPhoto(place.id)}
                    style={{
                      flex: 1, borderWidth: 2, borderStyle: "dashed",
                      borderColor: isDark ? "#374151" : "#e5e7eb",
                      borderRadius: 10, alignItems: "center", justifyContent: "center",
                      paddingVertical: place.image ? 0 : 20, gap: 4,
                      minHeight: 96,
                    }}
                  >
                    <MaterialCommunityIcons name="image-outline" size={24} color={isDark ? "#4b5563" : "#9ca3af"} />
                    <Text style={{ fontSize: 10, fontWeight: "600", color: isDark ? "#4b5563" : "#6b7280" }}>Upload Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Google Maps Link */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#9ca3af" : "#374151", marginBottom: 6 }}>Google Maps Link</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    style={{
                      flex: 1, backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, paddingRight: 36,
                      fontSize: 14, color: inputText,
                    }}
                    value={place.maps_link}
                    onChangeText={(t) => setNearbyPlaces(prev => prev.map(p => p.id === place.id ? { ...p, maps_link: t } : p))}
                    onBlur={() => syncNearbyField(place.id, "maps_link")}
                    placeholder="https://maps.app.goo.gl/..."
                    placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  <View style={{ position: "absolute", right: 12 }}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color={isDark ? "#4b5563" : "#9ca3af"} />
                  </View>
                </View>
              </View>

              {/* About Place */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#9ca3af" : "#374151", marginBottom: 6 }}>About Place</Text>
                <TextInput
                  style={{
                    backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                    fontSize: 14, color: inputText, minHeight: 140,
                    textAlignVertical: "top",
                  }}
                  value={place.description}
                  onChangeText={(t) => setNearbyPlaces(prev => prev.map(p => p.id === place.id ? { ...p, description: t } : p))}
                  onBlur={() => syncNearbyField(place.id, "description")}
                  placeholder="Describe why guests should visit this place..."
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  multiline
                  numberOfLines={6}
                />
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 140 }} />
    </View>
  );

  const renderPlaceholderTab = (tabName: string) => (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
      <MaterialCommunityIcons
        name={
          tabName === "Photos" ? "image-multiple-outline" :
          tabName === "Rooms" ? "bed-outline" :
          tabName === "Add-ons" ? "puzzle-outline" :
          tabName === "Reels" ? "video-outline" :
          tabName === "Nearby" ? "map-marker-radius-outline" :
          tabName === "Reviews" ? "star-outline" :
          "search-web"
        }
        size={48}
        color={isDark ? "#374151" : "#cbd5e1"}
      />
      <Text style={{ fontSize: 16, fontWeight: "700", color: inputText, marginTop: 16 }}>{tabName}</Text>
      <Text style={{ fontSize: 13, color: labelText, marginTop: 4 }}>Coming soon</Text>
    </View>
  );

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: modalBg }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: borderC }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: inputText }}>{isNew ? "Add New Stay" : "Edit Stay"}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8, marginRight: -8 }}>
            <MaterialCommunityIcons name="close" size={24} color={isDark ? "#9ca3af" : "#94a3b8"} />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: tabBarBg, borderBottomWidth: 1, borderBottomColor: borderC, flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: isActive ? "#16a34a" : "transparent" }}
              >
                <Text style={{ fontSize: 14, fontWeight: isActive ? "700" : "500", color: isActive ? "#16a34a" : (isDark ? "#64748b" : "#64748b") }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {activeTab === "Basic" ? renderBasicTab() :
           activeTab === "Photos" ? renderPhotosTab() :
           activeTab === "Rooms" ? renderRoomsTab() :
           activeTab === "Add-ons" ? renderAddOnsTab() :
           activeTab === "Reels" ? renderReelsTab() :
           activeTab === "Nearby" ? renderNearbyTab() :
           renderPlaceholderTab(activeTab)}
        </ScrollView>

        {/* Footer */}
        <View style={{ backgroundColor: modalBg, borderTopWidth: 1, borderTopColor: borderC, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, alignItems: "center" }}>
          {/* Progress dots */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
            {TABS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === tabIndex ? 8 : 6,
                  height: i === tabIndex ? 8 : 6,
                  borderRadius: 999,
                  backgroundColor: i === tabIndex ? "#16a34a" : (isDark ? "#374151" : "#e2e8f0"),
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 16, width: "100%" }}>
            <TouchableOpacity
              onPress={tabIndex === 0 ? onClose : goBack}
              style={{ flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? "#374151" : "#e2e8f0", alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#d1d5db" : "#475569" }}>
                {tabIndex === 0 ? "Close" : "Back"}
              </Text>
            </TouchableOpacity>

            {tabIndex === TABS.length - 1 ? (
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: "#16a34a", alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                  {saving ? "Saving…" : "Save Changes"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={goNext}
                style={{ flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: "#16a34a", alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Room Add/Edit Sheet */}
      {(editingRoom || addingRoom) && (
        <RoomEditSheet
          room={editingRoom}
          isDark={isDark}
          onClose={() => { setEditingRoom(null); setAddingRoom(false); }}
          onSave={saveRoom}
        />
      )}
    </Modal>
  );
}

function RoomEditSheet({ room, isDark, onClose, onSave }: {
  room: RoomCategory | null;
  isDark: boolean;
  onClose: () => void;
  onSave: (data: Partial<RoomCategory> & { id?: string }) => Promise<void>;
}) {
  const isNew = !room;
  const [name, setName] = useState(room?.name || "");
  const [maxGuests, setMaxGuests] = useState(String(room?.max_guests || 2));
  const [available, setAvailable] = useState(String(room?.available || 1));
  const [price, setPrice] = useState(String(room?.price || 0));
  const [originalPrice, setOriginalPrice] = useState(String(room?.original_price || 0));
  const [amenities, setAmenities] = useState<string[]>(room?.amenities || []);
  const [roomImages, setRoomImages] = useState<string[]>(room?.images || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const MAX_ROOM_PHOTOS = 4;
  const TILE = Math.floor((Dimensions.get("window").width - 20 * 2 - 8 * 3) / 4);

  const modalBg = isDark ? "#030712" : "#ffffff";
  const inputBg = isDark ? "#1f2937" : "#ffffff";
  const inputBorder = isDark ? "#374151" : "#e2e8f0";
  const inputText = isDark ? "#f9fafb" : "#0f172a";
  const labelText = isDark ? "#94a3b8" : "#64748b";
  const borderC = isDark ? "#1f2937" : "#f1f5f9";

  const pickRoomPhotos = async () => {
    if (roomImages.length >= MAX_ROOM_PHOTOS) {
      Alert.alert("Limit", `Max ${MAX_ROOM_PHOTOS} photos per room`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ROOM_PHOTOS - roomImages.length,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    const newUrls: string[] = [];
    for (const asset of result.assets) {
      try {
        if (!asset.base64) continue;
        const ext = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `rooms/${fileName}`;
        const { error } = await supabase.storage
          .from("stay-images")
          .upload(path, decode(asset.base64), { contentType: asset.mimeType || "image/jpeg" });
        if (error) continue;
        const { data: urlData } = supabase.storage.from("stay-images").getPublicUrl(path);
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
      } catch {}
    }
    if (newUrls.length) setRoomImages(prev => [...prev, ...newUrls]);
    setUploading(false);
  };

  const removeRoomImage = (url: string) => setRoomImages(prev => prev.filter(u => u !== url));

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Required", "Room name is required"); return; }
    setSaving(true);
    await onSave({
      ...(room?.id ? { id: room.id } : {}),
      name: name.trim(),
      max_guests: Number(maxGuests) || 2,
      available: Number(available) || 1,
      price: Number(price) || 0,
      original_price: Number(originalPrice) || 0,
      amenities,
      images: roomImages,
    });
    setSaving(false);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: modalBg }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: borderC }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: inputText }}>{isNew ? "Add Room" : "Edit Room"}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close" size={24} color={isDark ? "#9ca3af" : "#94a3b8"} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} keyboardShouldPersistTaps="handled">
          {/* Room Name */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Room Name</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: "600", color: inputText, backgroundColor: inputBg }}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Deluxe AC"
              placeholderTextColor={isDark ? "#6b7280" : "#94a3b8"}
            />
            </View>

          {/* Room Photos */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Photos</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {roomImages.map((url, idx) => (
                <View key={url} style={{ width: TILE, height: TILE, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "#374151" : "#e2e8f0" }}>
                  <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => removeRoomImage(url)}
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}
                  >
                    <MaterialCommunityIcons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
          </View>
              ))}
              {roomImages.length < MAX_ROOM_PHOTOS && (
          <TouchableOpacity
                  onPress={pickRoomPhotos}
                  disabled={uploading}
                  style={{
                    width: TILE, height: TILE, borderRadius: 10,
                    borderWidth: 2, borderStyle: "dashed",
                    borderColor: isDark ? "rgba(22,162,73,0.3)" : "#bbf7d0",
                    backgroundColor: isDark ? "rgba(22,162,73,0.05)" : "#f0fdf4",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#16a34a" />
                  ) : (
                    <MaterialCommunityIcons name="camera-plus-outline" size={22} color="#16a34a" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Max Guests + Available row */}
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Max Guests</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: "700", color: inputText, backgroundColor: inputBg, textAlign: "center" }}
                value={maxGuests}
                onChangeText={setMaxGuests}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Available</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: "700", color: inputText, backgroundColor: inputBg, textAlign: "center" }}
                value={available}
                onChangeText={setAvailable}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Prices row */}
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Price (₹)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: "700", color: inputText, backgroundColor: inputBg }}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Original (₹)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: inputBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: isDark ? "#6b7280" : "#94a3b8", backgroundColor: inputBg, textDecorationLine: "line-through" }}
                value={originalPrice}
                onChangeText={setOriginalPrice}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Amenities */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: labelText, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Amenities</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ROOM_AMENITIES.map(a => {
                const selected = amenities.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => toggleAmenity(a)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                      backgroundColor: selected ? "#16a34a" : (isDark ? "#111827" : "#ffffff"),
                      borderWidth: 1,
                      borderColor: selected ? "#16a34a" : (isDark ? "#374151" : "#e2e8f0"),
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: selected ? "700" : "500", color: selected ? "#ffffff" : (isDark ? "#d1d5db" : "#475569") }}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
              {saving ? "Saving…" : isNew ? "Add Room" : "Save Changes"}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StayCard({ stay, isDark, onEdit, onToggle, onDelete }: {
  stay: Stay; isDark: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const isActive = stay.status === "active";
  const cardBg = isDark
    ? (isActive ? "#111827" : "rgba(17,24,39,0.5)")
    : (isActive ? "#ffffff" : "rgba(248,250,252,0.7)");
  const borderC = isActive ? "rgba(22,162,73,0.1)" : (isDark ? "#374151" : "#e2e8f0");
  const titleColor = isActive ? (isDark ? "#f9fafb" : "#0f172a") : (isDark ? "#6b7280" : "#64748b");
  const subColor = isDark ? "#6b7280" : "#94a3b8";
  const priceColor = isActive ? "#16a34a" : (isDark ? "#6b7280" : "#94a3b8");

  return (
    <View style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: borderC, marginHorizontal: 16, marginTop: 12, overflow: "hidden", opacity: isActive ? 1 : 0.85 }}>
      {/* Top content */}
      <View style={{ flexDirection: "row", padding: 16, gap: 14 }}>
        {stay.images?.[0] ? (
          <Image
            source={{ uri: stay.images[0] }}
            style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: isDark ? "#1f2937" : "#f1f5f9" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: isDark ? "#1f2937" : "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="image-outline" size={32} color={isDark ? "#374151" : "#cbd5e1"} />
          </View>
        )}
        {/* Info */}
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: titleColor, flex: 1, marginRight: 8 }}>{stay.name}</Text>
              {stay.rating > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: isActive ? "#fffbeb" : (isDark ? "#1f2937" : "#f1f5f9"), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <MaterialCommunityIcons name="star" size={12} color={isActive ? "#f59e0b" : "#94a3b8"} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: isActive ? "#f59e0b" : "#94a3b8" }}>{stay.rating}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
              <MaterialCommunityIcons name="map-marker" size={14} color={subColor} />
              <Text style={{ fontSize: 12, color: subColor }}>{stay.location}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: priceColor }}>
              ₹{stay.price.toLocaleString("en-IN")}
              <Text style={{ fontSize: 10, fontWeight: "400", color: subColor }}>/night</Text>
            </Text>
            <View style={{
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
              backgroundColor: isActive ? "rgba(22,162,73,0.1)" : (isDark ? "#1f2937" : "#f1f5f9"),
              borderWidth: 1,
              borderColor: isActive ? "rgba(22,162,73,0.2)" : (isDark ? "#374151" : "#e2e8f0"),
            }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? "#16a34a" : (isDark ? "#6b7280" : "#64748b") }}>
                {isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: isDark ? "#1f2937" : "#f1f5f9", padding: 10, gap: 8 }}>
        <TouchableOpacity
          style={{ flex: 1.1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: isDark ? "#1f2937" : "#f1f5f9" }}
          onPress={onEdit}
        >
          <MaterialCommunityIcons name="pencil-outline" size={16} color={isDark ? "#d1d5db" : "#475569"} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#d1d5db" : "#475569" }}>Edit</Text>
        </TouchableOpacity>

        {isActive ? (
          <TouchableOpacity
            style={{ flex: 1.1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2", borderWidth: 1, borderColor: isDark ? "rgba(239,68,68,0.2)" : "#fee2e2" }}
            onPress={onToggle}
          >
            <MaterialCommunityIcons name="power" size={16} color="#dc2626" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#dc2626" }}>Deactivate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{ flex: 1.1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: "#16a34a" }}
            onPress={onToggle}
          >
            <MaterialCommunityIcons name="play" size={16} color="#fff" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Activate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onDelete}
          style={{ width: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingVertical: 8, backgroundColor: isDark ? "rgba(15,23,42,0.9)" : "#fef2f2" }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={isDark ? "#f97373" : "#dc2626"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const STAYS_PAGE = 20;

export default function StaysScreen() {
  const { tenantId } = useTenant();
  const { isDark } = useTheme();
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Stay | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isNewStay, setIsNewStay] = useState(false);

  const bg = isDark ? "#030712" : "#ffffff";
  const headerBg = isDark ? "rgba(3,7,18,0.8)" : "rgba(255,255,255,0.8)";
  const borderC = isDark ? "#1f2937" : "rgba(22,162,73,0.1)";
  const titleColor = isDark ? "#f9fafb" : "#0f172a";
  const subColor = isDark ? "#6b7280" : "#64748b";

  const activeCount = stays.filter(s => s.status === "active").length;

  const fetchStays = useCallback(async (offset = 0, replace = true) => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("stays")
      .select("id, stay_id, name, location, price, original_price, status, rating, reviews_count, category, images, description, amenities, seo_title, seo_description, seo_keywords, og_image_url, tenant_id, max_adults, max_children, max_pets")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + STAYS_PAGE - 1);

    const rows = (data || []) as Stay[];
    setHasMore(rows.length === STAYS_PAGE);
    if (replace) { setStays(rows); } else { setStays(prev => [...prev, ...rows]); }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchStays(); }, [tenantId]);

  const onRefresh = async () => { setRefreshing(true); await fetchStays(0, true); setRefreshing(false); };
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchStays(stays.length, false);
    setLoadingMore(false);
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("stays").update({ status: newStatus }).eq("id", id);
    if (error) { Alert.alert("Error", error.message); return; }
    setStays(s => s.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  const saveStay = async (updates: Partial<Stay>) => {
    if (!editing) return;
    const dbUpdates: Record<string, any> = { ...updates };
    delete dbUpdates.id;
    delete dbUpdates.stay_id;
    delete dbUpdates.rating;
    delete dbUpdates.reviews_count;
    const { error } = await supabase.from("stays").update(dbUpdates).eq("id", editing.id);
    if (error) { Alert.alert("Error", error.message); return; }
    setStays(s => s.map(x => x.id === editing.id ? { ...x, ...updates } : x));
    setEditing(null);
  };

  const deleteStay = async (stay: Stay) => {
    Alert.alert(
      "Delete stay",
      `Are you sure you want to delete “${stay.name}”? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("stays")
              .delete()
              .eq("id", stay.id);
            if (error) {
              Alert.alert("Error", error.message);
              return;
            }
            setStays(prev => prev.filter(s => s.id !== stay.id));
            if (editing?.id === stay.id) {
              setEditing(null);
            }
          },
        },
      ],
    );
  };

  const addStay = async () => {
    if (!tenantId || creating) return;
    setCreating(true);
    const stayId = "STAY-" + Date.now().toString(36).toUpperCase();
    const { data, error } = await supabase
      .from("stays")
      .insert({ stay_id: stayId, name: "New Stay", tenant_id: tenantId })
      .select("id, stay_id, name, location, price, original_price, status, rating, reviews_count, category, images, description, amenities, seo_title, seo_description, seo_keywords, og_image_url, tenant_id, max_adults, max_children, max_pets")
      .single();
    setCreating(false);
    if (error) { Alert.alert("Error", error.message); return; }
    const newStay = data as Stay;
    setStays(prev => [newStay, ...prev]);
    setIsNewStay(true);
    setEditing(newStay);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ backgroundColor: headerBg, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: borderC }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: titleColor, letterSpacing: -0.5 }}>Stays</Text>
            <Text style={{ fontSize: 13, fontWeight: "500", color: subColor, marginTop: 2 }}>{activeCount} active propert{activeCount !== 1 ? "ies" : "y"}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={addStay}
            disabled={creating}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#16a34a",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              shadowColor: "#16a34a",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            )}
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Add Stay</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlashList
          data={stays}
          estimatedItemSize={200}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
              <View style={{ flex: 1, backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "rgba(22,162,73,0.05)", borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: subColor, textTransform: "uppercase", letterSpacing: 1 }}>Total Revenue</Text>
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#16a34a", marginTop: 2 }}>
                  ₹{stays.filter(s => s.status === "active").reduce((sum, s) => sum + s.price, 0).toLocaleString("en-IN")}
                  </Text>
                </View>
              <View style={{ flex: 1, backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "rgba(22,162,73,0.05)", borderWidth: 1, borderColor: isDark ? "rgba(22,162,73,0.15)" : "rgba(22,162,73,0.1)", borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: subColor, textTransform: "uppercase", letterSpacing: 1 }}>Properties</Text>
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#16a34a", marginTop: 2 }}>{stays.length} Total</Text>
                  </View>
            </View>
          }
          ListFooterComponent={
            <View>
              <FooterSpinner loading={loadingMore} />
              <View style={{ height: 100 }} />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 64, alignItems: "center", paddingHorizontal: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "rgba(22,162,73,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <MaterialCommunityIcons name="home-plus-outline" size={36} color={isDark ? "#374151" : "#cbd5e1"} />
              </View>
              <Text style={{ color: titleColor, fontSize: 17, fontWeight: "700", marginBottom: 6 }}>No stays yet</Text>
              <Text style={{ color: subColor, fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>Add your first property to start managing bookings</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={addStay}
                disabled={creating}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#16a34a",
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 14,
                  shadowColor: "#16a34a",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                )}
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Add Your First Stay</Text>
              </TouchableOpacity>
                </View>
          }
          renderItem={({ item: s }) => (
            <StayCard
              stay={s}
              isDark={isDark}
              onEdit={() => {
                setIsNewStay(false);
                setEditing(s);
              }}
              onToggle={() => toggleStatus(s.id, s.status)}
              onDelete={() => deleteStay(s)}
            />
          )}
        />
      )}

      {editing && (
        <StayEditModal
          stay={editing}
          isDark={isDark}
          onClose={() => setEditing(null)}
          onSave={saveStay}
          isNew={isNewStay}
        />
      )}
    </SafeAreaView>
  );
}
