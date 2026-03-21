import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNotifications, AppNotification } from "@/context/NotificationContext";
import { useTheme } from "@/context/ThemeContext";

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  booking: { icon: "ticket-confirmation", color: "#16a34a", bg: "rgba(22,162,73,0.1)" },
  booking_status: { icon: "swap-horizontal-circle", color: "#2563eb", bg: "rgba(37,99,235,0.1)" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function NotificationRow({ item, onPress, isDark }: { item: AppNotification; onPress: () => void; isDark: boolean }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.booking;
  const isUnread = !item.read;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: isUnread
          ? isDark ? "rgba(22,162,73,0.06)" : "rgba(22,162,73,0.04)"
          : "transparent",
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9",
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: cfg.bg,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: isUnread ? "700" : "500",
              color: isDark ? "#f9fafb" : "#0f172a",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {isUnread && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" }} />
          )}
        </View>
        <Text
          style={{
            fontSize: 13,
            color: isDark ? "#9ca3af" : "#64748b",
            marginTop: 2,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text style={{ fontSize: 11, color: isDark ? "#6b7280" : "#94a3b8", marginTop: 4, fontWeight: "500" }}>
          {timeAgo(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onNotificationPress?: (notif: AppNotification) => void;
}

export default function NotificationPanel({ visible, onClose, onNotificationPress }: Props) {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const { isDark } = useTheme();

  const bg = isDark ? "#030712" : "#ffffff";
  const headerBorder = isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
  const titleColor = isDark ? "#f9fafb" : "#0f172a";
  const subColor = isDark ? "#6b7280" : "#94a3b8";

  const handlePress = async (notif: AppNotification) => {
    if (!notif.read) await markAsRead(notif.id);
    onNotificationPress?.(notif);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        {/* Handle bar */}
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <View style={{ height: 5, width: 40, borderRadius: 3, backgroundColor: isDark ? "#374151" : "#e2e8f0" }} />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: headerBorder,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", alignItems: "center", justifyContent: "center" }}
          >
            <MaterialCommunityIcons name="close" size={18} color={isDark ? "#9ca3af" : "#64748b"} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: titleColor }}>Notifications</Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Read All</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 52 }} />
          )}
        </View>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? "rgba(22,162,73,0.08)" : "rgba(22,162,73,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MaterialCommunityIcons name="bell-check-outline" size={32} color={isDark ? "#374151" : "#cbd5e1"} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: titleColor }}>All caught up!</Text>
            <Text style={{ fontSize: 13, color: subColor, marginTop: 4 }}>No notifications yet</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {unreadCount > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: subColor, letterSpacing: 1, textTransform: "uppercase" }}>
                  Unread ({unreadCount})
                </Text>
              </View>
            )}
            {notifications
              .filter((n) => !n.read)
              .map((n) => (
                <NotificationRow key={n.id} item={n} onPress={() => handlePress(n)} isDark={isDark} />
              ))}

            {notifications.some((n) => n.read) && (
              <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: subColor, letterSpacing: 1, textTransform: "uppercase" }}>
                  Earlier
                </Text>
              </View>
            )}
            {notifications
              .filter((n) => n.read)
              .map((n) => (
                <NotificationRow key={n.id} item={n} onPress={() => handlePress(n)} isDark={isDark} />
              ))}
            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
