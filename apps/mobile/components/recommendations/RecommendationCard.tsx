import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Recommendation } from "../../types/api";
import { t } from "../../utils/i18n";

interface Props {
  rec: Recommendation;
  index: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#4ade80",
  medium: "#f59e0b",
  advanced: "#f87171",
};

// Per-type theme: gradient + accent + icon fallback
const TYPE_THEME: Record<string, { from: string; to: string; accent: string; label: string }> = {
  makeup:       { from: "rgba(244,114,182,0.22)", to: "rgba(244,114,182,0.04)", accent: "#f472b6", label: "Maquillage" },
  grooming:     { from: "rgba(96,165,250,0.22)",  to: "rgba(96,165,250,0.04)",  accent: "#60a5fa", label: "Grooming" },
  haircut:      { from: "rgba(167,139,250,0.22)", to: "rgba(167,139,250,0.04)", accent: "#a78bfa", label: "Coupe" },
  skincare:     { from: "rgba(74,222,128,0.22)",  to: "rgba(74,222,128,0.04)",  accent: "#4ade80", label: "Skincare" },
  skincare_advanced: { from: "rgba(93,202,165,0.22)", to: "rgba(93,202,165,0.04)", accent: "#5DCAA5", label: "Soin ciblé" },
  color_season: { from: "rgba(251,191,36,0.22)",  to: "rgba(251,191,36,0.04)",  accent: "#fbbf24", label: "Couleurs" },
};

// steps/products can arrive as array, JSON string, or null depending on serialization
function parseArr<T>(field: unknown): T[] {
  if (Array.isArray(field)) return field as T[];
  if (typeof field === "string") {
    try { const p = JSON.parse(field); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

export function RecommendationCard({ rec, index }: Props) {
  const router = useRouter();
  const diffColor = DIFFICULTY_COLORS[rec.difficulty] ?? "#94a3b8";
  const theme = TYPE_THEME[rec.type] ?? { from: "rgba(201,130,107,0.2)", to: "rgba(255,255,255,0.02)", accent: "#C9826B", label: rec.type };

  const steps = parseArr<{ title: string }>(rec.steps);
  const products = parseArr<unknown>(rec.products);
  const stepCount = steps.length;
  const productCount = products.length;
  const firstStepTitle = steps[0]?.title ?? "";

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(16)}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/recs/${rec.id}` as any)}
        style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 24, overflow: "hidden", borderWidth: 0.5, borderColor: `${theme.accent}30` }}
      >
        <LinearGradient
          colors={[theme.from, theme.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Top: big icon + type + premium */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: `${theme.accent}22`, borderWidth: 0.5, borderColor: `${theme.accent}40`, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 30 }}>{rec.icon_emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Text style={{ color: theme.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>
                  {theme.label}
                </Text>
                {rec.is_premium_only && (
                  <View style={{ backgroundColor: "rgba(201,168,76,0.2)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: "#C9826B", fontSize: 9, fontWeight: "700" }}>✨ PREMIUM</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={2} style={{ color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 21 }}>
                {rec.title}
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 19 }}>
              {rec.summary}
            </Text>
          </View>

          {/* First step preview — only if a real title exists */}
          {firstStepTitle.length > 0 && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 14, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${theme.accent}30`, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "800" }}>1</Text>
              </View>
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, flex: 1 }}>
                {firstStepTitle}
              </Text>
            </View>
          )}

          {/* Footer: metadata + CTA */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: "rgba(201,130,107,0.12)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: diffColor }} />
                <Text style={{ color: diffColor, fontSize: 11, fontWeight: "600" }}>
                  {t(`recs.difficulty_${rec.difficulty}` as any)}
                </Text>
              </View>
              {stepCount > 0 && (
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                  📋 {stepCount}
                </Text>
              )}
              {productCount > 0 && (
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                  🛍️ {productCount}
                </Text>
              )}
              {rec.duration_min > 0 && (
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                  ⏱️ {rec.duration_min}min
                </Text>
              )}
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${theme.accent}25`, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: theme.accent, fontSize: 14, fontWeight: "700" }}>→</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
