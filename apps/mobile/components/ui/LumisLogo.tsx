import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

interface Props {
  size?: number;
  showWordmark?: boolean;
}

export function LumisLogo({ size = 80, showWordmark = false }: Props) {
  const colors = useThemeColors();
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.229;
  const haloR = size * 0.146;
  const dotR = size * 0.052;
  const rayGap = size * 0.04;
  const rayLen = size * 0.07;

  // ── Shared values ───────────────────────────────────────────────────────────
  const sunRot = useSharedValue(0);     // soleil (rayons) — horaire 12s
  const ringRot = useSharedValue(0);    // anneau pointillés — anti-horaire 16s
  const pulse = useSharedValue(0);      // point central — 3s aller-retour
  const halo = useSharedValue(0);       // halo — 3s aller-retour
  const float = useSharedValue(0);      // flottement — 4s aller-retour
  const radar1 = useSharedValue(0);     // onde radar 1 — 2.5s
  const radar2 = useSharedValue(0);     // onde radar 2 — 2.5s, décalée

  useEffect(() => {
    sunRot.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
    ringRot.value = withRepeat(
      withTiming(-360, { duration: 16000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    halo.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    float.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    radar1.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    radar2.value = withDelay(
      1200,
      withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  // ── Animated styles ─────────────────────────────────────────────────────────
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -5]) }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sunRot.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRot.value}deg` }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 1.1]) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 1], [0.06, 0.18]),
  }));
  const radar1Style = useAnimatedStyle(() => ({
    opacity: interpolate(radar1.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(radar1.value, [0, 1], [1, 1.8]) }],
  }));
  const radar2Style = useAnimatedStyle(() => ({
    opacity: interpolate(radar2.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(radar2.value, [0, 1], [1, 1.8]) }],
  }));

  const layer = { position: "absolute" as const, width: size, height: size };

  // 8 rays at 0,45,...315 degrees
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const r1 = ringR + rayGap;
    const r2 = r1 + rayLen;
    return {
      x1: cx + r1 * Math.cos(rad),
      y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad),
      y2: cy + r2 * Math.sin(rad),
    };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View style={[{ width: size, height: size }, floatStyle]}>
        {/* Circular background */}
        <View style={layer}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={size / 2} fill={colors.logoBg} />
          </Svg>
        </View>

        {/* Radar waves (behind) */}
        <Animated.View style={[layer, radar1Style]}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={TERRACOTTA} strokeWidth={size * 0.012} />
          </Svg>
        </Animated.View>
        <Animated.View style={[layer, radar2Style]}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={TERRACOTTA} strokeWidth={size * 0.012} />
          </Svg>
        </Animated.View>

        {/* Halo (breathing) */}
        <Animated.View style={[layer, haloStyle]}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={haloR} fill={TERRACOTTA} />
          </Svg>
        </Animated.View>

        {/* Dashed ring (counter-clockwise) */}
        <Animated.View style={[layer, ringStyle]}>
          <Svg width={size} height={size}>
            <Circle
              cx={cx}
              cy={cy}
              r={ringR}
              fill="none"
              stroke={TERRACOTTA}
              strokeWidth={size * 0.018}
              strokeDasharray={`${size * 0.035} ${size * 0.03}`}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Sun rays (clockwise) */}
        <Animated.View style={[layer, sunStyle]}>
          <Svg width={size} height={size}>
            {rays.map((r, i) => (
              <Line
                key={i}
                x1={r.x1}
                y1={r.y1}
                x2={r.x2}
                y2={r.y2}
                stroke={TERRACOTTA}
                strokeWidth={size * 0.018}
                strokeLinecap="round"
              />
            ))}
          </Svg>
        </Animated.View>

        {/* Central dot (pulsing) */}
        <Animated.View style={[layer, dotStyle]}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={dotR} fill={TERRACOTTA} />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Wordmark */}
      {showWordmark && (
        <View style={styles.wordmarkWrap}>
          <Text style={[styles.wordmark, { color: colors.text }]}>LUMIS</Text>
          <Text style={styles.tagline}>your skin. your light.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkWrap: {
    alignItems: "center",
    marginTop: 18,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: 4,
  },
  tagline: {
    color: TERRACOTTA,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 6,
  },
});
