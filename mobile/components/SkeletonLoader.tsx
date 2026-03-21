import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useTheme } from "@/context/ThemeContext";

function Pulse({ style }: { style?: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const { isDark } = useTheme();

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const bg = isDark ? "bg-gray-800" : "bg-gray-200";

  return (
    <Animated.View style={{ opacity }} className={`${bg} rounded-lg ${style || ""}`} />
  );
}

export function CardSkeleton() {
  const { isDark } = useTheme();
  const cardBg = isDark ? "bg-gray-900" : "bg-white";

  return (
    <View className={`${cardBg} mx-4 mt-3 rounded-2xl p-4`}>
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Pulse style="h-4 w-32 mb-2" />
          <Pulse style="h-3 w-20 mb-2" />
          <Pulse style="h-3 w-40" />
        </View>
        <View className="items-end">
          <Pulse style="h-5 w-16 mb-2" />
          <Pulse style="h-4 w-12" />
        </View>
      </View>
    </View>
  );
}

export function StatSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-gray-900" : "bg-gray-100";

  return (
    <View className={`${bg} rounded-2xl p-4 flex-1`}>
      <Pulse style="h-3 w-16 mb-2" />
      <Pulse style="h-7 w-12 mb-1" />
      <Pulse style="h-2.5 w-10" />
    </View>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

export function DashboardSkeleton() {
  const { isDark } = useTheme();
  const headerBg = isDark ? "bg-gray-900" : "bg-white";
  const borderColor = isDark ? "border-gray-800" : "border-gray-100";

  return (
    <View className="flex-1">
      <View className={`${headerBg} px-5 py-4 border-b ${borderColor}`}>
        <Pulse style="h-6 w-40 mb-2" />
        <Pulse style="h-3 w-24" />
      </View>
      <View className="px-4 pt-4">
        <View className="flex-row gap-3">
          <StatSkeleton />
          <StatSkeleton />
        </View>
        <View className="flex-row gap-3 mt-3">
          <StatSkeleton />
          <StatSkeleton />
        </View>
        <View className={`${headerBg} rounded-2xl p-4 mt-3`}>
          <Pulse style="h-4 w-32 mb-3" />
          <View className="flex-row items-end justify-between h-24">
            {[40, 60, 30, 80, 50, 70].map((h, i) => (
              <View key={i} className="items-center flex-1 mx-0.5">
                <Pulse style={`w-full h-[${h}px]`} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function FooterSpinner({ loading }: { loading: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const { isDark } = useTheme();

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: loading ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [loading]);

  if (!loading) return null;

  const dotBg = isDark ? "bg-gray-600" : "bg-gray-300";

  return (
    <Animated.View style={{ opacity }} className="py-4 items-center flex-row justify-center gap-1">
      <Pulse style={`h-2 w-2 rounded-full ${dotBg}`} />
      <Pulse style={`h-2 w-2 rounded-full ${dotBg}`} />
      <Pulse style={`h-2 w-2 rounded-full ${dotBg}`} />
    </Animated.View>
  );
}
