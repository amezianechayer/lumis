import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
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

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  makeup:       { bg: "rgba(244,114,182,0.15)", text: "#f472b6" },
  grooming:     { bg: "rgba(96,165,250,0.15)",  text: "#60a5fa" },
  haircut:      { bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  skincare:     { bg: "rgba(74,222,128,0.15)",  text: "#4ade80" },
  color_season: { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
};

export function RecommendationCard({ rec, index }: Props) {
  const router = useRouter();
  const diffColor = DIFFICULTY_COLORS[rec.difficulty] ?? "#94a3b8";
  const typeStyle = TYPE_COLORS[rec.type] ?? { bg: "rgba(255,255,255,0.08)", text: "#94a3b8" };
  const typeLabel = rec.type.replace("_", " ").toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(16)}>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push(`/recs/${rec.id}` as any)}
        className="mx-4 mb-3 rounded-2xl overflow-hidden border border-white/8"
        style={{ backgroundColor: "#111111" }}
      >
        {/* Top row */}
        <View className="px-4 pt-4 pb-3 flex-row items-start gap-3">
          {/* Icon */}
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: typeStyle.bg }}
          >
            <Text style={{ fontSize: 22 }}>{rec.icon_emoji}</Text>
          </View>

          {/* Title + badges */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1 flex-wrap">
              {rec.is_premium_only && (
                <View className="bg-lumis-gold/20 border border-lumis-gold/40 rounded-full px-2 py-0.5">
                  <Text className="text-lumis-gold font-body text-[9px]">✨ Premium</Text>
                </View>
              )}
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: typeStyle.bg }}>
                <Text style={{ color: typeStyle.text, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>
                  {typeLabel}
                </Text>
              </View>
            </View>
            <Text className="text-lumis-white font-body-medium text-sm leading-5" numberOfLines={2}>
              {rec.title}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View className="px-4 pb-2">
          <Text numberOfLines={2} className="text-lumis-white/55 font-body text-xs leading-5">
            {rec.summary}
          </Text>
        </View>

        {/* First step preview */}
        {rec.steps && rec.steps.length > 0 && (
          <View className="mx-4 mb-3 px-3 py-2 rounded-xl" style={{ backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.15)" }}>
            <Text style={{ color: "rgba(201,168,76,0.6)", fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 }}>
              ÉTAPE 1
            </Text>
            <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              {rec.steps[0].title}
            </Text>
            {rec.steps[0].description ? (
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 }}>
                {rec.steps[0].description}
              </Text>
            ) : null}
          </View>
        )}

        {/* Footer */}
        <View
          className="px-4 py-2.5 flex-row items-center justify-between"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}
        >
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: diffColor }} />
              <Text style={{ color: diffColor, fontSize: 11 }}>
                {t(`recs.difficulty_${rec.difficulty}` as any)}
              </Text>
            </View>
            {(rec.steps?.length ?? 0) > 0 && (
              <Text className="text-lumis-white/25 font-body text-xs">
                {rec.steps!.length} étape{rec.steps!.length > 1 ? "s" : ""}
              </Text>
            )}
            {(rec.products?.length ?? 0) > 0 && (
              <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
                🛍️ {rec.products!.length} produit{rec.products!.length > 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <Text className="text-lumis-white/30 font-body text-xs">
            {rec.duration_min} min →
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
