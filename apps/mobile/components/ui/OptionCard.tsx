import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  icon?: string;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  showCheck?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function OptionCard({
  icon,
  label,
  description,
  selected,
  onPress,
  showCheck = true,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedTouchable
      style={animatedStyle}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      className={`rounded-2xl border px-5 py-4 flex-row items-center gap-4 ${
        selected
          ? "bg-lumis-gold/15 border-lumis-gold"
          : "bg-card border-line"
      }`}
    >
      {icon && <Text className="text-2xl">{icon}</Text>}

      <View className="flex-1">
        <Text
          className={`font-body-medium text-base ${
            selected ? "text-lumis-gold" : "text-lumis-white"
          }`}
        >
          {label}
        </Text>
        {description && (
          <Text className="text-lumis-white/50 font-body text-sm mt-0.5">
            {description}
          </Text>
        )}
      </View>

      {showCheck && selected && (
        <View className="w-5 h-5 rounded-full bg-lumis-gold items-center justify-center">
          <Text className="text-lumis-black text-xs font-body-bold">✓</Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}
