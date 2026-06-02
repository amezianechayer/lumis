import { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface Props {
  width?: number | `${number}%`;
  height?: number;
  rounded?: "sm" | "md" | "lg" | "full";
  style?: ViewStyle;
}

const ROUNDED_MAP = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 999,
};

export function Skeleton({ width = "100%", height = 20, rounded = "md", style }: Props) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700 }),
        withTiming(0.3, { duration: 700 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as number,
          height,
          borderRadius: ROUNDED_MAP[rounded],
          backgroundColor: "rgba(232,213,192,0.12)",
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <View className="bg-white/5 border border-white/10 rounded-2xl p-5 gap-3">
      <Skeleton width="60%" height={16} rounded="sm" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "80%" : "100%"}
          height={12}
          rounded="sm"
        />
      ))}
    </View>
  );
}
