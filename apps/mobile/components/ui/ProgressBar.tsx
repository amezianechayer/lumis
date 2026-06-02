import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface Props {
  step: number;
  total: number;
}

export function ProgressBar({ step, total }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming((step / total) * 100, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, total]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View className="h-0.5 bg-card rounded-full overflow-hidden">
      <Animated.View
        style={animatedStyle}
        className="h-full bg-lumis-gold rounded-full"
      />
    </View>
  );
}
