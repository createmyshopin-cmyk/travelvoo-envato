import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { registerPushToken } from "@/lib/pushNotifications";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Verify admin role
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

      // Register push token for this tenant
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (tenantData?.id) {
        registerPushToken(tenantData.id).catch(() => {/* non-fatal */});
      }

      router.replace("/(admin)/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-8 py-12">
          {/* Logo / Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">S</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Stay Admin</Text>
            <Text className="text-gray-500 mt-1">Manage your property on the go</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
                placeholder="admin@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-gray-50"
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className="bg-primary rounded-xl py-4 items-center mt-6"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
