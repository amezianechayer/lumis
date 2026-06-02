import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "gold" | "outline" | "ghost";
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "gold",
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const baseClass = "rounded-xl py-4 items-center justify-center";
  const variantClass =
    variant === "gold"
      ? disabled
        ? "bg-card"
        : "bg-lumis-gold"
      : variant === "outline"
      ? "border border-line bg-transparent"
      : "bg-transparent";

  const textClass =
    variant === "gold"
      ? disabled
        ? "text-white/30"
        : "text-lumis-black"
      : "text-lumis-white";

  return (
    <AnimatedTouchable
      style={animatedStyle}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      className={`${baseClass} ${variantClass}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "gold" ? "#0D0D0F" : "#FAFAF8"} />
      ) : (
        <Text className={`font-body-bold text-base ${textClass}`}>{label}</Text>
      )}
    </AnimatedTouchable>
  );
}
