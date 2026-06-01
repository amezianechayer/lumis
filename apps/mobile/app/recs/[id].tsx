import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../services/api";
import { RecProduct, RecStep } from "../../types/api";
import { t } from "../../utils/i18n";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  advanced: "#ef4444",
};

export default function RecDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: rec, isLoading, isError } = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => api.getRecommendationById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: "#0f0e17" }}>
        <ActivityIndicator color="#c9a84c" size="large" />
      </SafeAreaView>
    );
  }

  if (isError || !rec) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "#0f0e17" }}>
        <Text style={{ color: "#ef4444", fontSize: 16 }}>{t("common.error")}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: "#c9a84c", fontWeight: "600" }}>{t("common.back")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const diffColor = DIFFICULTY_COLORS[rec.difficulty] ?? "#94a3b8";
  // steps/products can arrive as array, JSON string, or null depending on GORM serialization
  const parseJsonField = <T,>(field: unknown): T[] => {
    if (Array.isArray(field)) return field as T[];
    if (typeof field === "string") {
      try { const p = JSON.parse(field); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  };
  const steps: RecStep[] = parseJsonField<RecStep>(rec.steps);
  const products: RecProduct[] = parseJsonField<RecProduct>(rec.products);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#0f0e17" }}>
      {/* Top bar */}
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.75} className="mr-3 p-1">
          <Text style={{ color: "#c9a84c", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text className="flex-1 font-bold text-lg" style={{ color: "#f8fafc" }} numberOfLines={1}>
          {rec.title}
        </Text>
        {rec.is_premium_only && (
          <View className="px-2 py-1 rounded-full ml-2" style={{ backgroundColor: "#b8860b" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {t("recs.premium_badge")}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <Animated.View entering={FadeInDown.springify()} className="mx-4 mb-4 rounded-2xl p-5" style={{ backgroundColor: "#1a1a2e" }}>
          <View className="flex-row items-center mb-3 gap-3">
            <Text style={{ fontSize: 40 }}>{rec.icon_emoji}</Text>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: diffColor }} />
                <Text style={{ color: diffColor, fontSize: 12, fontWeight: "600" }}>
                  {t(`recs.difficulty_${rec.difficulty}` as any)}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>·</Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {t("recs.duration_min", { n: rec.duration_min })}
                </Text>
              </View>
              <Text className="text-base font-bold" style={{ color: "#f8fafc" }}>
                {rec.title}
              </Text>
            </View>
          </View>
          <Text style={{ color: "#94a3b8", fontSize: 14, lineHeight: 21 }}>
            {rec.summary}
          </Text>

          {/* Occasions */}
          {rec.occasions?.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {rec.occasions.map((o) => (
                <View key={o} className="px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(201,168,76,0.15)" }}>
                  <Text style={{ color: "#c9a84c", fontSize: 11, fontWeight: "600" }}>
                    {o}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Steps */}
        {steps.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} className="mx-4 mb-4">
            <Text className="text-base font-bold mb-3" style={{ color: "#f8fafc" }}>
              {t("recs.steps_title")}
            </Text>
            {steps.map((step, i) => (
              <View key={i} className="mb-4 flex-row gap-3">
                {/* Step number */}
                <View
                  className="w-8 h-8 rounded-full items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: "#c9a84c" }}
                >
                  <Text style={{ color: "#0f0e17", fontWeight: "800", fontSize: 13 }}>{step.order}</Text>
                </View>
                <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: "#1a1a2e" }}>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-bold text-sm" style={{ color: "#f8fafc" }}>
                      {step.title}
                    </Text>
                    {step.duration_min ? (
                      <Text style={{ color: "#64748b", fontSize: 11 }}>
                        {t("recs.duration_min", { n: step.duration_min })}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: "#94a3b8", fontSize: 13, lineHeight: 19 }}>
                    {step.description}
                  </Text>
                  {step.tip ? (
                    <View
                      className="mt-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "rgba(201,168,76,0.1)" }}
                    >
                      <Text style={{ color: "#c9a84c", fontSize: 12 }}>
                        {t("recs.tip_label")} {step.tip}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Products */}
        {products.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} className="mx-4">
            <Text className="text-base font-bold mb-3" style={{ color: "#f8fafc" }}>
              {t("recs.products_title")}
            </Text>
            {products.map((p, i) => (
              <View
                key={i}
                className="mb-3 rounded-xl p-4 flex-row items-start gap-3"
                style={{ backgroundColor: "#1a1a2e" }}
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center shrink-0"
                  style={{ backgroundColor: p.premium ? "rgba(184,134,11,0.2)" : "rgba(201,168,76,0.1)" }}
                >
                  <Text style={{ fontSize: 16 }}>{p.premium ? "💎" : "🛍️"}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="font-bold text-sm" style={{ color: "#f8fafc" }}>
                      {p.name}
                    </Text>
                    {p.premium && (
                      <Text style={{ color: "#b8860b", fontSize: 10, fontWeight: "700" }}>PREMIUM</Text>
                    )}
                  </View>
                  <Text style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>
                    {p.category}
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 18 }}>
                    {p.why}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
