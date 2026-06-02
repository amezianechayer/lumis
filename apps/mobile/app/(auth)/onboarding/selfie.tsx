import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { OnboardingLayout } from "../../../components/onboarding/OnboardingLayout";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { useFaceAnalysis } from "../../../hooks/useFaceAnalysis";
import { t } from "../../../utils/i18n";
import { useLanguageStore } from "../../../stores/language.store";
import { FaceProfile, ColorSeason } from "../../../types/api";

const SEASON_PALETTES: Record<ColorSeason, string[]> = {
  spring: ["#FF9E80", "#FFD180", "#CCFF90", "#EA80FC", "#FFF9C4"],
  summer: ["#CE93D8", "#90CAF9", "#A5D6A7", "#F48FB1", "#B2EBF2"],
  autumn: ["#BF360C", "#E65100", "#827717", "#33691E", "#4E342E"],
  winter: ["#1A237E", "#880E4F", "#004D40", "#212121", "#B71C1C"],
};

const ANALYZING_TEXTS = [
  "Analyse de la forme du visage…",
  "Détection de l'undertone…",
  "Calcul de ta saison couleur…",
  "Génération des recommandations…",
];

export default function SelfieScreen() {
  useLanguageStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [textIdx, setTextIdx] = useState(0);
  const { phase, result, error, analyze, reset } = useFaceAnalysis();

  const scannerY = useSharedValue(0);
  const guideScale = useSharedValue(1);

  useEffect(() => {
    guideScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, []);

  useEffect(() => {
    if (phase !== "analyzing") return;
    scannerY.value = withRepeat(
      withSequence(
        withTiming(220, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
    setTextIdx(0);
    const interval = setInterval(() => setTextIdx((i) => (i + 1) % ANALYZING_TEXTS.length), 900);
    return () => clearInterval(interval);
  }, [phase]);

  const scannerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scannerY.value }] }));
  const guideStyle = useAnimatedStyle(() => ({ transform: [{ scale: guideScale.value }] }));

  const pickPhoto = async (source: "camera" | "library") => {
    let res: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      res = await ImagePicker.launchCameraAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    }
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      await analyze(res.assets[0].uri);
    }
  };

  const isAnalyzing = phase === "compressing" || phase === "analyzing";

  return (
    <>
      {/* ── Idle / Error ── */}
      {(phase === "idle" || phase === "error") && (
        <OnboardingLayout step={4}>
          <Animated.View entering={FadeIn.duration(400)} className="flex-1 px-6">
            <View className="mt-2 mb-6">
              <Text className="text-lumis-white font-display text-3xl mb-2">
                {t("onboarding.selfie.title")}
              </Text>
              <Text className="text-lumis-white/60 font-body text-base leading-6">
                {t("onboarding.selfie.subtitle")}
              </Text>
            </View>

            <View className="flex-1 items-center justify-center">
              <Animated.View style={guideStyle} className="relative items-center justify-center">
                <View className="w-56 h-72 rounded-full border-2 border-lumis-gold/60 items-center justify-center">
                  <View className="w-48 h-64 rounded-full border border-lumis-gold/20 items-center justify-center">
                    <Text className="text-lumis-white/25 font-body text-xs text-center px-10">
                      {t("onboarding.selfie.guide_label")}
                    </Text>
                  </View>
                </View>
                <View className="absolute top-5 left-14 w-5 h-5 border-t-2 border-l-2 border-lumis-gold" />
                <View className="absolute top-5 right-14 w-5 h-5 border-t-2 border-r-2 border-lumis-gold" />
                <View className="absolute bottom-5 left-14 w-5 h-5 border-b-2 border-l-2 border-lumis-gold" />
                <View className="absolute bottom-5 right-14 w-5 h-5 border-b-2 border-r-2 border-lumis-gold" />
              </Animated.View>
            </View>

            <View className="flex-row gap-3 mb-5">
              {["☀️ Lumière naturelle", "😐 Regard droit", "📵 Sans filtre"].map((tip) => (
                <View key={tip} className="flex-1 bg-card rounded-xl py-2 px-1 items-center">
                  <Text className="text-lumis-white/45 font-body text-[10px] text-center leading-4">{tip}</Text>
                </View>
              ))}
            </View>

            {error && (
              <Animated.View entering={FadeIn} className="mb-3 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
                <Text className="text-danger font-body text-sm text-center">
                  {error === "analysis_failed"
                    ? "Analyse échouée — réessaie"
                    : "Une erreur est survenue — réessaie"}
                </Text>
              </Animated.View>
            )}

            <View className="gap-3 pb-4">
              <PrimaryButton
                label={t("onboarding.selfie.take_selfie")}
                onPress={() => pickPhoto("camera")}
              />
              <PrimaryButton
                label={t("onboarding.selfie.choose_photo")}
                onPress={() => pickPhoto("library")}
                variant="outline"
              />
            </View>
          </Animated.View>
        </OnboardingLayout>
      )}

      {/* ── Analyzing ── */}
      {isAnalyzing && (
        <SafeAreaView
          className="flex-1 bg-lumis-black"
          style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
        >
          <Animated.View entering={FadeIn.duration(300)} className="flex-1 items-center justify-center px-6">
            {photoUri && (
              <View className="relative w-56 h-56 rounded-3xl overflow-hidden mb-8 border border-lumis-gold/30">
                <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute inset-0 bg-lumis-gold/8" />
                <Animated.View style={scannerStyle} className="absolute left-0 right-0">
                  <View className="h-px bg-lumis-gold" />
                  <View className="h-8" style={{ backgroundColor: "rgba(201,169,110,0.07)" }} />
                </Animated.View>
                <View className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-lumis-gold" />
                <View className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-lumis-gold" />
                <View className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-lumis-gold" />
                <View className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-lumis-gold" />
              </View>
            )}

            <Text className="text-lumis-gold font-display text-2xl text-center mb-3">
              {phase === "compressing" ? "Préparation de l'image…" : t("onboarding.selfie.analyzing_title")}
            </Text>

            <Text className="text-lumis-white/55 font-body text-sm text-center">
              {phase === "analyzing" ? ANALYZING_TEXTS[textIdx % ANALYZING_TEXTS.length] : ""}
            </Text>

            <View className="flex-row gap-2 mt-8">
              {(["compressing", "analyzing"] as const).map((s, i) => {
                const current = phase === "compressing" ? 0 : 1;
                const isActive = i === current;
                const isDone = i < current;
                return (
                  <View
                    key={s}
                    className={`rounded-full ${isActive ? "w-4 h-2 bg-lumis-gold" : isDone ? "w-2 h-2 bg-lumis-gold/60" : "w-2 h-2 bg-white/15"}`}
                  />
                );
              })}
            </View>
          </Animated.View>
        </SafeAreaView>
      )}

      {/* ── Result ── */}
      {phase === "done" && result && <FaceResultScreen result={result} />}
    </>
  );
}

function FaceResultScreen({ result }: { result: FaceProfile }) {
  useLanguageStore();

  const faceShapes = t("onboarding.selfie.face_shapes") as unknown as Record<string, string>;
  const seasons = t("onboarding.selfie.seasons") as unknown as Record<string, string>;
  const faceDescs = t("onboarding.selfie.face_descriptions") as unknown as Record<string, string>;

  const faceLabel = faceShapes[result.face_shape] ?? result.face_shape.toUpperCase();
  const seasonLabel = seasons[result.color_season] ?? result.color_season.toUpperCase();
  const faceDesc = faceDescs[result.face_shape] ?? "";
  const undertoneKey = `onboarding.selfie.undertone_${result.undertone}`;
  const palette = SEASON_PALETTES[result.color_season] ?? [];

  const cardScale = useSharedValue(0.92);
  useEffect(() => { cardScale.value = withSpring(1, { damping: 12 }); }, []);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0)} className="items-center mb-6">
          <View className="bg-lumis-gold/20 rounded-full px-4 py-1.5 mb-4">
            <Text className="text-lumis-gold font-body-medium text-xs">
              {t("onboarding.selfie.result_badge")}
            </Text>
          </View>
          <Text className="text-lumis-white font-display text-2xl text-center">
            {t("onboarding.selfie.result_title")}
          </Text>
        </Animated.View>

        <Animated.View style={cardStyle}>
          <Animated.View entering={FadeInDown.delay(100)} className="bg-lumis-gold/12 border border-lumis-gold/40 rounded-3xl p-6 mb-4 items-center">
            <Text className="text-lumis-gold/60 font-body text-[10px] uppercase tracking-widest mb-1">
              {t("onboarding.selfie.face_shape_label")}
            </Text>
            <Text className="text-lumis-white font-display text-5xl mb-2">{faceLabel}</Text>
            <View className="bg-lumis-gold/20 rounded-full px-3 py-0.5 mb-3">
              <Text className="text-lumis-gold font-body text-xs">
                Confiance {Math.round(result.face_shape_confidence * 100)}%
              </Text>
            </View>
            <Text className="text-lumis-white/55 font-body text-sm text-center leading-5 max-w-xs">
              {faceDesc}
            </Text>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-card border border-line rounded-2xl p-4 items-center">
            <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1">
              {t("onboarding.selfie.undertone_label")}
            </Text>
            <Text className="text-lumis-white font-body-bold text-base">{t(undertoneKey)}</Text>
          </View>
          <View className="flex-1 bg-lumis-gold/10 border border-lumis-gold/30 rounded-2xl p-4 items-center">
            <Text className="text-lumis-gold/60 font-body text-[10px] uppercase tracking-widest mb-1">
              {t("onboarding.selfie.season_label")}
            </Text>
            <Text className="text-lumis-gold font-body-bold text-base">{seasonLabel}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280)} className="bg-card border border-line rounded-2xl p-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1">Forme des yeux</Text>
            <Text className="text-lumis-white font-body-medium text-base capitalize">{result.eye_shape}</Text>
          </View>
          <View>
            <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1 text-right">Écart</Text>
            <Text className="text-lumis-white font-body-medium text-base text-right capitalize">{result.eye_distance}</Text>
          </View>
        </Animated.View>

        {palette.length > 0 && (
          <Animated.View entering={FadeInDown.delay(360)} className="bg-card border border-line rounded-2xl p-4 mb-6">
            <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-3">
              Ta palette saison {seasonLabel}
            </Text>
            <View className="flex-row gap-2">
              {palette.map((color) => (
                <View key={color} className="flex-1 h-8 rounded-xl" style={{ backgroundColor: color }} />
              ))}
            </View>
          </Animated.View>
        )}

        {result.beard_recommendations && result.beard_recommendations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(440)} className="bg-lumis-slate/15 border border-lumis-slate/30 rounded-2xl p-4 mb-4">
            <Text className="text-lumis-slate font-body-bold text-xs uppercase tracking-widest mb-2">Barbes recommandées</Text>
            <View className="flex-row flex-wrap gap-2">
              {result.beard_recommendations.slice(0, 3).map((r) => (
                <View key={r} className="bg-lumis-slate/20 rounded-full px-3 py-1">
                  <Text className="text-lumis-white/70 font-body text-xs">{r.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(520)}>
          <PrimaryButton
            label={t("onboarding.selfie.cta")}
            onPress={() => router.push("/(auth)/onboarding/skin-type")}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
