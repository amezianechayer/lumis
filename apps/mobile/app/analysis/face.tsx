import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { router, useNavigation } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { ColorSeason, FaceProfile } from "../../types/api";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import { useLanguageStore } from "../../stores/language.store";
import { useAuthStore } from "../../stores/auth.store";
import { t } from "../../utils/i18n";
import { getMakeupGuide, FaceShape } from "../../utils/makeupTips";
import { FaceMakeupDiagram } from "../../components/ui/FaceMakeupDiagram";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

const SEASON_PALETTES: Record<ColorSeason, string[]> = {
  spring: ["#FF9E80", "#FFD180", "#CCFF90", "#EA80FC", "#FFF9C4"],
  summer: ["#CE93D8", "#90CAF9", "#A5D6A7", "#F48FB1", "#B2EBF2"],
  autumn: ["#BF360C", "#E65100", "#827717", "#33691E", "#4E342E"],
  winter: ["#1A237E", "#880E4F", "#004D40", "#212121", "#B71C1C"],
};

export default function FaceAnalysisScreen() {
  useLanguageStore();
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ["face-profile", "latest"],
    queryFn: () => api.getLatestFaceProfile(),
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-lumis-black"
        style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
      >
        <View className="px-6 pt-4 pb-2 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-lumis-white/60 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-lumis-white font-display text-xl">Ton profil facial</Text>
        </View>
        <View className="px-6 gap-4 mt-4">
          <SkeletonCard lines={2} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Skeleton height={80} rounded="lg" /></View>
            <View className="flex-1"><Skeleton height={80} rounded="lg" /></View>
          </View>
          <SkeletonCard lines={1} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView
        className="flex-1 bg-lumis-black items-center justify-center px-6"
        style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
      >
        <Text className="text-lumis-white font-display text-2xl text-center mb-4">
          Aucune analyse disponible
        </Text>
        <Text className="text-lumis-white/50 font-body text-base text-center mb-8">
          Fais ton analyse faciale pour voir ton profil complet
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/onboarding/selfie")}
          className="bg-lumis-gold rounded-xl py-4 px-8"
        >
          <Text className="text-lumis-black font-body-bold">Analyser mon visage</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return <ProfileDetail profile={profile} />;
}

function ProfileDetail({ profile }: { profile: FaceProfile }) {
  const tc = useThemeColors();
  const { user } = useAuthStore();
  const isMale = user?.gender === "male";
  const faceShapes = t("onboarding.selfie.face_shapes") as unknown as Record<string, string>;
  const seasons = t("onboarding.selfie.seasons") as unknown as Record<string, string>;
  const faceDescs = t("onboarding.selfie.face_descriptions") as unknown as Record<string, string>;
  const makeupGuide = getMakeupGuide(profile.face_shape, user?.gender);

  const faceLabel = faceShapes[profile.face_shape] ?? profile.face_shape.toUpperCase();
  const seasonLabel = seasons[profile.color_season] ?? profile.color_season.toUpperCase();
  const palette = SEASON_PALETTES[profile.color_season] ?? [];

  const createdDate = new Date(profile.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      {/* Header */}
      <Animated.View
        entering={FadeIn}
        className="px-6 pt-4 pb-2 flex-row items-center gap-3"
      >
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Text className="text-lumis-white/60 text-xl">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lumis-white font-display text-xl">Ton profil facial</Text>
          <Text className="text-lumis-white/40 font-body text-xs">{createdDate}</Text>
        </View>
        <View className="bg-lumis-gold/20 rounded-full px-3 py-1">
          <Text className="text-lumis-gold font-body text-xs">v{profile.analysis_version}</Text>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Face shape */}
        <Animated.View
          entering={FadeInDown.delay(80)}
          className="bg-lumis-gold/12 border border-lumis-gold/40 rounded-3xl p-6 mb-4 items-center"
        >
          <Text className="text-lumis-gold/60 font-body text-[10px] uppercase tracking-widest mb-1">
            Forme du visage
          </Text>
          <Text className="text-lumis-white font-display text-5xl mb-2">{faceLabel}</Text>
          <View className="bg-lumis-gold/20 rounded-full px-3 py-0.5 mb-3">
            <Text className="text-lumis-gold font-body text-xs">
              Confiance {Math.round(profile.face_shape_confidence * 100)}%
            </Text>
          </View>
          <Text className="text-lumis-white/55 font-body text-sm text-center leading-5 max-w-xs">
            {faceDescs[profile.face_shape] ?? ""}
          </Text>
        </Animated.View>

        {/* Undertone + Season avec explications */}
        <Animated.View entering={FadeInDown.delay(160)} className="mb-4">
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-card border border-line rounded-2xl p-4">
              <Text style={{ color: tc.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Sous-ton de peau
              </Text>
              <Text style={{ color: tc.text, fontWeight: "700", fontSize: 16, textTransform: "capitalize", marginBottom: 4 }}>
                {profile.undertone === "warm" ? "Chaud" : profile.undertone === "cool" ? "Froid" : "Neutre"}
              </Text>
              <Text style={{ color: tc.textMuted, fontSize: 11, lineHeight: 16 }}>
                {profile.undertone === "warm"
                  ? "Reflets dorés/pêche. Tes veines sont vertes. Les couleurs terre & or te subliment."
                  : profile.undertone === "cool"
                  ? "Reflets rosés/bleutés. Tes veines sont bleutées. L'argent et les tons fuchsia t'avantagent."
                  : "Mixte. Tu peux porter aussi bien l'or que l'argent selon les couleurs."}
              </Text>
            </View>
            <View className="flex-1 bg-lumis-gold/10 border border-lumis-gold/30 rounded-2xl p-4">
              <Text style={{ color: tc.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Saison couleur
              </Text>
              <Text style={{ color: TERRACOTTA, fontWeight: "700", fontSize: 16, marginBottom: 4 }}>
                {seasonLabel}
              </Text>
              <Text style={{ color: tc.textMuted, fontSize: 11, lineHeight: 16 }}>
                {profile.color_season === "spring"
                  ? "Couleurs chaudes & lumineuses : corail, pêche, ivoire. Évite le noir pur."
                  : profile.color_season === "summer"
                  ? "Couleurs douces & fraîches : lavande, rose poudré, bleu ciel. Évite l'orange."
                  : profile.color_season === "autumn"
                  ? "Couleurs profondes & chaudes : rouille, olive, brun. Évite le rose vif."
                  : "Couleurs vives & contrastées : blanc pur, noir, rouge. Évite les tons trop doux."}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Color palette */}
        {palette.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200)}
            className="bg-card border border-line rounded-2xl p-4 mb-4"
          >
            <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1">
              Ta palette de couleurs à porter
            </Text>
            <Text style={{ color: tc.textFaint, fontSize: 11, marginBottom: 10 }}>
              Ces couleurs subliment naturellement ton teint
            </Text>
            <View className="flex-row gap-2">
              {palette.map((c) => (
                <View key={c} className="flex-1 h-12 rounded-xl items-end justify-end p-1" style={{ backgroundColor: c }}>
                  <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 8 }}>{c}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Color quiz CTA — precise undertone test */}
        <Animated.View entering={FadeInDown.delay(220)} className="mb-4">
          <TouchableOpacity
            onPress={() => router.push("/skin-tone-quiz")}
            activeOpacity={0.85}
            style={{
              backgroundColor: tc.bgCard,
              borderWidth: 0.5, borderColor: tc.border,
              borderRadius: 16, padding: 16,
              flexDirection: "row", alignItems: "center", gap: 12,
            }}
          >
            <Text style={{ fontSize: 24 }}>🎨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: tc.text, fontWeight: "600", fontSize: 14 }}>
                Affiner avec le test colorimétrie
              </Text>
              <Text style={{ color: tc.textMuted, fontSize: 12, marginTop: 2 }}>
                6 questions pour déterminer ton sous-ton précis (veines, bijoux, soleil…)
              </Text>
            </View>
            <Text style={{ color: TERRACOTTA, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Features grid */}
        <Animated.View entering={FadeInDown.delay(240)} className="flex-row flex-wrap gap-3 mb-4">
          <FeatureTile label="Yeux" value={profile.eye_shape} />
          <FeatureTile label="Écart yeux" value={profile.eye_distance} />
          <FeatureTile label="Nez" value={profile.nose_shape} />
          <FeatureTile label="Lèvres" value={profile.lip_shape} />
          <FeatureTile label="Mâchoire" value={profile.jaw_type} />
          <FeatureTile label="Carnation" value={profile.skin_tone.replace("fitzpatrick_", "Fitz. ")} />
        </Animated.View>

        {/* Beard recs — men only */}
        {isMale && profile.beard_recommendations && profile.beard_recommendations.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(300)}
            className="bg-lumis-slate/15 border border-lumis-slate/30 rounded-2xl p-4 mb-4"
          >
            <Text className="text-lumis-slate font-body-bold text-xs uppercase tracking-widest mb-3">
              Barbes recommandées
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {profile.beard_recommendations.map((r) => (
                <View key={r} className="bg-lumis-slate/20 rounded-full px-3 py-1.5">
                  <Text className="text-lumis-white/70 font-body text-xs">{r.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Haircut recs */}
        {profile.haircut_recommendations && profile.haircut_recommendations.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(340)}
            className="bg-card border border-line rounded-2xl p-4 mb-4"
          >
            <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-3">
              Coupes recommandées
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {profile.haircut_recommendations.map((r) => (
                <View key={r} className="bg-card rounded-full px-3 py-1.5">
                  <Text className="text-lumis-white/70 font-body text-xs">{r.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ─── Guide maquillage / grooming par forme de visage ─── */}
        <Animated.View entering={FadeInDown.delay(380)} className="bg-card border border-line rounded-2xl p-5 mb-4">
          <Text className="text-lumis-gold font-body-bold text-xs uppercase tracking-widest mb-1">
            {isMale ? "💈 Guide grooming" : "💄 Guide maquillage"}
          </Text>
          <Text style={{ color: tc.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
            {makeupGuide.goal}
          </Text>

          {/* Visual diagram (makeup zones — women only) */}
          {!isMale && (
            <FaceMakeupDiagram guide={makeupGuide} faceShape={(profile.face_shape as FaceShape) ?? "oval"} skinTone={profile.skin_tone} />
          )}

          {/* Zone hints */}
          <View style={{ marginTop: 16, gap: 8 }}>
            {makeupGuide.contour.map((z, i) => (
              <View key={`c${i}`} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#7A5C3E", marginTop: 3 }} />
                <Text style={{ color: tc.textMuted, fontSize: 13, flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{z.zone} :</Text> {z.action}
                </Text>
              </View>
            ))}
            {makeupGuide.highlight.map((z, i) => (
              <View key={`h${i}`} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFF4D6", marginTop: 3 }} />
                <Text style={{ color: tc.textMuted, fontSize: 13, flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{z.zone} :</Text> {z.action}
                </Text>
              </View>
            ))}
            {makeupGuide.blush ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#F4A0B8", marginTop: 3 }} />
                <Text style={{ color: tc.textMuted, fontSize: 13, flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>Blush :</Text> {makeupGuide.blush}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 2 }}>
              <Text style={{ fontSize: 13 }}>✏️</Text>
              <Text style={{ color: tc.textMuted, fontSize: 13, flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>Sourcils :</Text> {makeupGuide.brows}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── CTA Guide IA personnalisé ─── */}
        <Animated.View entering={FadeInDown.delay(400)} className="mb-4">
          <TouchableOpacity
            onPress={() => router.push("/makeup-guide")}
            activeOpacity={0.85}
            style={{
              backgroundColor: tc.primaryMuted,
              borderWidth: 0.5, borderColor: tc.border,
              borderRadius: 16, padding: 16,
              flexDirection: "row", alignItems: "center", gap: 12,
            }}
          >
            <Text style={{ fontSize: 26 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: TERRACOTTA, fontWeight: "700", fontSize: 15 }}>
                Guide {isMale ? "grooming" : "maquillage"} personnalisé par IA
              </Text>
              <Text style={{ color: tc.textMuted, fontSize: 12, marginTop: 2 }}>
                Adapté à ton teint, ton scan peau et tes objectifs
              </Text>
            </View>
            <Text style={{ color: TERRACOTTA, fontSize: 20 }}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── Step-by-step guide (base) ─── */}
        <Animated.View entering={FadeInDown.delay(420)} className="bg-lumis-gold/8 border border-lumis-gold/25 rounded-2xl p-5 mb-4">
          <Text style={{ color: tc.textFaint, fontSize: 11, marginBottom: 12 }}>
            Conseils de base · le guide IA ci-dessus est personnalisé
          </Text>
          <Text className="text-lumis-gold font-body-bold text-xs uppercase tracking-widest mb-4">
            📋 Étape par étape
          </Text>
          {makeupGuide.steps.map((step, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: i === makeupGuide.steps.length - 1 ? 0 : 16 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tc.primaryMuted, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Text style={{ color: TERRACOTTA, fontSize: 12, fontWeight: "800" }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tc.text, fontWeight: "600", fontSize: 14, marginBottom: 2 }}>{step.title}</Text>
                <Text style={{ color: tc.textMuted, fontSize: 13, lineHeight: 19 }}>{step.description}</Text>
                {step.tip ? (
                  <View style={{ marginTop: 6, backgroundColor: tc.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: TERRACOTTA, fontSize: 12 }}>💡 {step.tip}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Re-analyze CTA */}
        <Animated.View entering={FadeInDown.delay(460)}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/onboarding/selfie")}
            className="border border-lumis-gold/40 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-lumis-gold font-body-medium text-base">
              🔄 Relancer l'analyse
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({ label, value, gold }: { label: string; value: string; gold: boolean }) {
  return (
    <View
      className={`flex-1 rounded-2xl p-4 items-center border ${
        gold ? "bg-lumis-gold/10 border-lumis-gold/30" : "bg-card border-line"
      }`}
    >
      <Text className={`font-body text-[10px] uppercase tracking-widest mb-1 ${gold ? "text-lumis-gold/60" : "text-lumis-white/40"}`}>
        {label}
      </Text>
      <Text className={`font-body-bold text-base capitalize ${gold ? "text-lumis-gold" : "text-lumis-white"}`}>
        {value}
      </Text>
    </View>
  );
}

function FeatureTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-card border border-line rounded-xl p-3 items-center" style={{ width: "30.5%" }}>
      <Text className="text-lumis-white/35 font-body text-[9px] uppercase tracking-widest mb-0.5">
        {label}
      </Text>
      <Text className="text-lumis-white/80 font-body-medium text-xs capitalize text-center">
        {value}
      </Text>
    </View>
  );
}
