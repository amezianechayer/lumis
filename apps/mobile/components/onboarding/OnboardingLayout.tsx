import { View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { ProgressBar } from "../ui/ProgressBar";

interface Props {
  step: number;
  total?: number;
  children: React.ReactNode;
  showBack?: boolean;
}

const TOTAL_STEPS = 5;

export function OnboardingLayout({ step, total = TOTAL_STEPS, children, showBack = true }: Props) {
  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <Animated.View entering={FadeIn.duration(300)} className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-4">
            {showBack ? (
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-8 h-8 items-center justify-center"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-lumis-white/60 text-xl">←</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-8" />
            )}

            <Text className="text-lumis-white/40 font-body text-xs">
              {step} / {total}
            </Text>

            <View className="w-8" />
          </View>

          <ProgressBar step={step} total={total} />
        </View>

        {/* Content */}
        <View className="flex-1">{children}</View>
      </Animated.View>
    </SafeAreaView>
  );
}
