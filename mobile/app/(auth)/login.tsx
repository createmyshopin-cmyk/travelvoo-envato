import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { registerPushToken } from "@/lib/pushNotifications";
import { useTheme } from "@/context/ThemeContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert("Login Failed", error.message);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert("Error", "Session not found"); return; }

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!isAdmin) {
        await supabase.auth.signOut();
        Alert.alert("Access Denied", "This account does not have admin access.");
        return;
      }

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (tenantData?.id) {
        registerPushToken(tenantData.id).catch(() => {});
      }

      router.replace("/(admin)/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (email.trim()) {
      supabase.auth.resetPasswordForEmail(email.trim());
      Alert.alert("Check your email", "If the email exists, a password reset link has been sent.");
    } else {
      Alert.alert("Enter email", "Please enter your email first, then tap Forgot password.");
    }
  };

  const bg = isDark ? "#0a1610" : "#ffffff";
  const inputBg = isDark ? "rgba(22,162,73,0.06)" : "#f1f5f9";
  const inputText = isDark ? "#f9fafb" : "#0f172a";
  const labelColor = isDark ? "#e2e8f0" : "#334155";
  const placeholderColor = isDark ? "#4b5563" : "#94a3b8";
  const subtitleColor = isDark ? "#94a3b8" : "#64748b";
  const iconColor = isDark ? "#6b7280" : "#94a3b8";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: bg }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 }}>
          {/* Logo + Title */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 14,
              backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              shadowColor: "#16a34a", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
            }}>
              <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "800" }}>S</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: isDark ? "#f1f5f9" : "#0f172a", letterSpacing: -0.5, marginBottom: 6 }}>
              Stay Admin
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "400", color: subtitleColor }}>
              Manage your property on the go
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 18 }}>
            {/* Email */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: labelColor, marginBottom: 8, marginLeft: 2 }}>Email</Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14,
              }}>
                <MaterialCommunityIcons name="email-outline" size={20} color={iconColor} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 10, fontSize: 15, color: inputText }}
                  placeholder="admin@example.com"
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: labelColor, marginBottom: 8, marginLeft: 2 }}>Password</Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14,
              }}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={iconColor} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 10, fontSize: 15, color: inputText }}
                  placeholder="••••••••"
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={iconColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <View style={{ alignItems: "flex-end" }}>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: "#16a34a", borderRadius: 12,
                paddingVertical: 16, alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: 8, marginTop: 12,
                shadowColor: "#16a34a", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800" }}>Sign In</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={{ paddingBottom: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: subtitleColor }}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL("mailto:support@easystay.com")} style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#16a34a" }}>Contact support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
