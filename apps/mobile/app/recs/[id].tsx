import React from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../services/api";
import { RecProduct, RecStep } from "../../types/api";
import { t } from "../../utils/i18n";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#4ade80",
  medium: "#f59e0b",
  advanced: "#f87171",
};

const TYPE_THEME: Record<string, { from: string; to: string; accent: string; label: string }> = {
  makeup:       { from: "rgba(244,114,182,0.25)", to: "rgba(244,114,182,0.03)", accent: "#f472b6", label: "Maquillage" },
  grooming:     { from: "rgba(96,165,250,0.25)",  to: "rgba(96,165,250,0.03)",  accent: "#60a5fa", label: "Grooming" },
  haircut:      { from: "rgba(167,139,250,0.25)", to: "rgba(167,139,250,0.03)", accent: "#a78bfa", label: "Coupe" },
  skincare:     { from: "rgba(74,222,128,0.25)",  to: "rgba(74,222,128,0.03)",  accent: "#4ade80", label: "Skincare" },
  color_season: { from: "rgba(251,191,36,0.25)",  to: "rgba(251,191,36,0.03)",  accent: "#fbbf24", label: "Couleurs" },
};

function parseArr<T>(field: unknown): T[] {
  if (Array.isArray(field)) return field as T[];
  if (typeof field === "string") {
    try { const p = JSON.parse(field); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </SafeAreaView>
    );
  }

  if (isError || !rec) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Text style={{ color: "#f87171", fontSize: 16, marginBottom: 16 }}>{t("common.error")}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#C9A84C", fontWeight: "600" }}>{t("common.back")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const theme = TYPE_THEME[rec.type] ?? { from: "rgba(201,168,76,0.2)", to: "rgba(201,168,76,0.03)", accent: "#C9A84C", label: rec.type };
  const diffColor = DIFFICULTY_COLORS[rec.difficulty] ?? "#94a3b8";
  const steps: RecStep[] = parseArr<RecStep>(rec.steps);
  const products: RecProduct[] = parseArr<RecProduct>(rec.products);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Top bar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.75} style={{ padding: 6 }}>
          <Text style={{ color: theme.accent, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginLeft: 4 }}>
          {theme.label}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.springify()} style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: `${theme.accent}30` }}>
          <LinearGradient colors={[theme.from, theme.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: `${theme.accent}22`, borderWidth: 1, borderColor: `${theme.accent}40`, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 32 }}>{rec.icon_emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 19, fontWeight: "700", lineHeight: 24 }}>{rec.title}</Text>
                  {rec.is_premium_only && (
                    <View style={{ alignSelf: "flex-start", marginTop: 6, backgroundColor: "rgba(201,168,76,0.2)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ color: "#C9A84C", fontSize: 10, fontWeight: "700" }}>✨ PREMIUM</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 21 }}>{rec.summary}</Text>

              {/* Meta row */}
              <View style={{ flexDirection: "row", gap: 16, marginTop: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: diffColor }} />
                  <Text style={{ color: diffColor, fontSize: 12, fontWeight: "600" }}>{t(`recs.difficulty_${rec.difficulty}` as any)}</Text>
                </View>
                {rec.duration_min > 0 && (
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>⏱️ {rec.duration_min} min</Text>
                )}
                {steps.length > 0 && (
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>📋 {steps.length} étapes</Text>
                )}
              </View>

              {/* Occasions */}
              {rec.occasions?.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {rec.occasions.map((o) => (
                    <View key={o} style={{ backgroundColor: `${theme.accent}18`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "600" }}>{o}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Steps */}
        {steps.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 14 }}>
              {t("recs.steps_title")}
            </Text>
            {steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#0A0A0A", fontWeight: "800", fontSize: 13 }}>{step.order || i + 1}</Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={{ width: 2, flex: 1, backgroundColor: `${theme.accent}25`, marginTop: 4 }} />
                  )}
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, marginBottom: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, flex: 1 }}>{step.title}</Text>
                    {step.duration_min ? (
                      <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{step.duration_min} min</Text>
                    ) : null}
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 19 }}>{step.description}</Text>
                  {step.tip ? (
                    <View style={{ marginTop: 8, backgroundColor: `${theme.accent}12`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Text style={{ color: theme.accent, fontSize: 12, lineHeight: 17 }}>💡 {step.tip}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Products */}
        {products.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginHorizontal: 16 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 14 }}>
              {t("recs.products_title")}
            </Text>
            {products.map((p, i) => (
              <View key={i} style={{ marginBottom: 10, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: p.premium ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.08)" }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.premium ? "rgba(201,168,76,0.2)" : `${theme.accent}18`, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>{p.premium ? "💎" : "🛍️"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, flex: 1 }}>{p.name}</Text>
                    {p.premium && <Text style={{ color: "#C9A84C", fontSize: 9, fontWeight: "700" }}>PREMIUM</Text>}
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1, marginBottom: 5 }}>{p.category}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18 }}>{p.why}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Empty fallback */}
        {steps.length === 0 && products.length === 0 && (
          <View style={{ alignItems: "center", padding: 32 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📝</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center" }}>
              Régénère tes recommandations pour obtenir un guide détaillé étape par étape.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
