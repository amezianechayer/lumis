import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  interpolate, Easing,
} from "react-native-reanimated";
import { Motion } from "../../utils/exercises";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

interface Props {
  emoji: string;
  motion?: Motion;
  size?: number;
}

// Animated, looping demonstration of a face-yoga movement.
// Schematic (emoji + directional cues) rather than real video.
export function ExerciseAnimation({ emoji, motion = "pulse", size = 180 }: Props) {
  const c = useThemeColors();
  const p = useSharedValue(0); // 0->1 reversing loop
  const rot = useSharedValue(0); // continuous for circular

  useEffect(() => {
    const fast = motion === "tap";
    p.value = 0;
    p.value = withRepeat(
      withTiming(1, { duration: fast ? 450 : 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    if (motion === "circular") {
      rot.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    }
  }, [motion]);

  const emojiStyle = useAnimatedStyle(() => {
    "worklet";
    let translateX = 0, translateY = 0, scale = 1, rotate = "0deg";
    switch (motion) {
      case "up":
        translateY = interpolate(p.value, [0, 1], [10, -16]);
        break;
      case "push-forward":
        translateX = interpolate(p.value, [0, 1], [-4, 16]);
        break;
      case "push-back":
        translateX = interpolate(p.value, [0, 1], [4, -16]);
        break;
      case "pulse":
        scale = interpolate(p.value, [0, 1], [0.88, 1.16]);
        break;
      case "puff":
        scale = interpolate(p.value, [0, 1], [0.82, 1.36]);
        break;
      case "tap":
        translateY = interpolate(p.value, [0, 1], [0, -7]);
        break;
      case "breathe":
        scale = interpolate(p.value, [0, 1], [0.94, 1.07]);
        break;
      case "outward":
        scale = interpolate(p.value, [0, 1], [0.96, 1.08]);
        break;
      case "circular":
        rotate = `${rot.value}deg`;
        break;
      case "hold":
      default:
        scale = interpolate(p.value, [0, 1], [0.98, 1.03]);
        break;
    }
    return { transform: [{ translateX }, { translateY }, { scale }, { rotate }] };
  });

  // Pulsing ring backdrop
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.35, 0.7]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.95, 1.05]) }],
  }));

  // Directional cue arrows
  const cueStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.5, 1], [0.15, 0.9, 0.15]) }));

  const arrowColor = TERRACOTTA;
  const renderCues = () => {
    const a = { color: arrowColor, fontSize: 26, fontWeight: "700" as const };
    switch (motion) {
      case "up":
        return <Animated.Text style={[a, cueStyle, { position: "absolute", top: 6 }]}>↑</Animated.Text>;
      case "push-forward":
        return <Animated.Text style={[a, cueStyle, { position: "absolute", right: 10 }]}>→</Animated.Text>;
      case "push-back":
        return <Animated.Text style={[a, cueStyle, { position: "absolute", left: 10 }]}>←</Animated.Text>;
      case "outward":
        return (
          <>
            <Animated.Text style={[a, cueStyle, { position: "absolute", left: 8 }]}>←</Animated.Text>
            <Animated.Text style={[a, cueStyle, { position: "absolute", right: 8 }]}>→</Animated.Text>
          </>
        );
      case "tap":
        return <Animated.Text style={[a, cueStyle, { position: "absolute", top: 10, fontSize: 18 }]}>• • •</Animated.Text>;
      case "circular":
        return <Animated.Text style={[a, cueStyle, { position: "absolute", top: 6 }]}>↻</Animated.Text>;
      default:
        return null;
    }
  };

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          { position: "absolute", width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, backgroundColor: c.primaryMuted, borderWidth: 1, borderColor: `${TERRACOTTA}40` },
          ringStyle,
        ]}
      />
      {renderCues()}
      <Animated.Text style={[{ fontSize: size * 0.34 }, emojiStyle]}>{emoji}</Animated.Text>
    </View>
  );
}
