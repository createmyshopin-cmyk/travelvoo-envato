import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/context/NotificationContext";
import { useTheme } from "@/context/ThemeContext";

const { width } = Dimensions.get("window");

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  booking: { icon: "ticket-confirmation", color: "#16a34a", bg: "rgba(22,162,73,0.1)" },
  booking_status: { icon: "swap-horizontal-circle", color: "#2563eb", bg: "rgba(37,99,235,0.1)" },
};

export default function NotificationPopup() {
  const { popup, dismissPopup } = useNotifications();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (popup) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -200, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [popup]);

  if (!popup) return null;

  const typeInfo = TYPE_ICONS[popup.type] || TYPE_ICONS.booking;
  const cardBg = isDark ? "#1f2937" : "#ffffff";
  const titleColor = isDark ? "#f9fafb" : "#0f172a";
  const bodyColor = isDark ? "#9ca3af" : "#64748b";

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 12,
        right: 12,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={dismissPopup}
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 12,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: typeInfo.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: titleColor }} numberOfLines={1}>
            {popup.title}
          </Text>
          <Text style={{ fontSize: 12, color: bodyColor, marginTop: 2 }} numberOfLines={2}>
            {popup.body}
          </Text>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="close" size={14} color={isDark ? "#6b7280" : "#94a3b8"} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
