import "../global.css";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "@/context/TenantContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationPopup from "@/components/NotificationPopup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function InnerLayout() {
  const { isDark } = useTheme();

  return (
    <View className={`flex-1 ${isDark ? "dark" : ""}`}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
      <NotificationPopup />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <ThemeProvider>
            <NotificationProvider>
              <InnerLayout />
            </NotificationProvider>
          </ThemeProvider>
        </TenantProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
