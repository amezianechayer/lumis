import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { MMKV } from "react-native-mmkv";
import Animated, { FadeIn } from "react-native-reanimated";
import { fetchWeather, buildAdvice, WeatherData, WeatherAdvice } from "../../utils/weather";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";
const storage = new MMKV({ id: "lumis-weather" });
const CACHE_KEY = "weather_cache_v1";
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3h

type State =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "error" }
  | { kind: "ok"; data: WeatherData; advice: WeatherAdvice };

export function WeatherTipCard() {
  const c = useThemeColors();
  const [state, setState] = useState<State>({ kind: "loading" });

  const cardStyle = {
    backgroundColor: c.bgCard,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 60,
  };

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // Try cache first
    try {
      const cached = storage.getString(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { ts: number; data: WeatherData };
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setState({ kind: "ok", data: parsed.data, advice: buildAdvice(parsed.data) });
          return;
        }
      }
    } catch {}

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let granted = status === "granted";
      if (!granted) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.status === "granted";
      }
      if (!granted) {
        setState({ kind: "denied" });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
      // Reverse-geocode to a human-readable city name (best-effort).
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        data.city = geo[0]?.city ?? geo[0]?.subregion ?? geo[0]?.region ?? undefined;
      } catch {}
      storage.set(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      setState({ kind: "ok", data, advice: buildAdvice(data) });
    } catch {
      setState({ kind: "error" });
    }
  }

  if (state.kind === "loading") {
    return (
      <View style={cardStyle}>
        <ActivityIndicator color={TERRACOTTA} size="small" />
      </View>
    );
  }

  if (state.kind === "denied" || state.kind === "error") {
    return (
      <TouchableOpacity style={cardStyle} onPress={() => { setState({ kind: "loading" }); load(); }} activeOpacity={0.8}>
        <Text style={{ fontSize: 22, marginRight: 12 }}>☀️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: "600", fontSize: 14 }}>Conseil du jour</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
            {state.kind === "denied" ? "Active la localisation pour un conseil météo personnalisé" : "Touche pour réessayer"}
          </Text>
        </View>
        <Text style={{ color: TERRACOTTA, fontSize: 12 }}>↻</Text>
      </TouchableOpacity>
    );
  }

  const { data, advice } = state;
  return (
    <Animated.View entering={FadeIn} style={[cardStyle, { flexDirection: "column", alignItems: "stretch" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Text numberOfLines={1} style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, flex: 1 }}>
          {data.city ? `📍 ${data.city}` : "Conseil du jour"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>🌡️ {data.temp}°</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>💧 {data.humidity}%</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: advice.uvColor }} />
            <Text style={{ color: advice.uvColor, fontSize: 12, fontWeight: "600" }}>UV {data.uvIndex}</Text>
          </View>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {advice.tips.map((tip, i) => (
          <Text key={i} style={{ color: c.textMuted, fontSize: 13, lineHeight: 19 }}>{tip}</Text>
        ))}
      </View>
    </Animated.View>
  );
}
