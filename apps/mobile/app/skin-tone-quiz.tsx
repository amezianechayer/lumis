import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { QUIZ, QuizOption, computeQuizResult, QuizResult } from "../utils/colorQuiz";
import { api } from "../services/api";
import { useThemeColors } from "../stores/theme.store";

const TERRACOTTA = "#C9826B";

const SEASON_PALETTES: Record<string, string[]> = {
  spring: ["#FF9E80", "#FFD180", "#FFF1A8", "#A8E6A0", "#FFB3C6"],
  summer: ["#CE93D8", "#90CAF9", "#B2EBF2", "#F8BBD0", "#C5CAE9"],
  autumn: ["#BF5B1B", "#D98324", "#8A7A2E", "#5C7A3E", "#7A4A2E"],
  winter: ["#1A237E", "#C2185B", "#00695C", "#212121", "#B71C1C"],
};

export default function SkinToneQuizScreen() {
  const router = useRouter();
  const t = useThemeColors();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizOption>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saving, setSaving] = useState(false);

  const isResult = step >= QUIZ.length;
  const progress = isResult ? 1 : step / QUIZ.length;

  const handleAnswer = (opt: QuizOption) => {
    const q = QUIZ[step];
    const next = { ...answers, [q.id]: opt };
    setAnswers(next);
    if (step + 1 >= QUIZ.length) {
      setResult(computeQuizResult(next));
      setStep(step + 1);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) { router.back(); return; }
    setStep(step - 1);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await api.saveColorQuiz({
        undertone: result.undertone,
        skin_tone: result.skinTone,
        color_season: result.colorSeason,
      });
      queryClient.invalidateQueries({ queryKey: ["face-profile", "latest"] });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  // ── RESULT ──
  if (isResult && result) {
    const palette = SEASON_PALETTES[result.colorSeason] ?? [];
    const utColor = result.undertone === "warm" ? "#E8A35C" : result.undertone === "cool" ? "#7BA0D0" : "#B0A0C0";
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Animated.View entering={FadeIn} style={{ alignItems: "center", marginTop: 12, marginBottom: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🎨</Text>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: "700", textAlign: "center" }}>Ton résultat</Text>
            <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>
              Fiabilité {result.confidence}%
            </Text>
          </Animated.View>

          {/* Undertone */}
          <Animated.View entering={FadeInDown.delay(80)} style={{ backgroundColor: `${utColor}18`, borderWidth: 0.5, borderColor: `${utColor}50`, borderRadius: 20, padding: 20, marginBottom: 14 }}>
            <Text style={{ color: t.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Sous-ton</Text>
            <Text style={{ color: utColor, fontSize: 26, fontWeight: "800" }}>{result.undertoneLabel}</Text>
            <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
              {result.undertone === "warm"
                ? "Reflets dorés/pêche. L'or, les tons terre, corail et olive te subliment."
                : result.undertone === "cool"
                ? "Reflets rosés/bleutés. L'argent, le fuchsia, le bleu et les tons joyaux t'avantagent."
                : "Équilibré. Tu peux porter l'or comme l'argent et une large palette de couleurs."}
            </Text>
          </Animated.View>

          {/* Skin tone + season */}
          <Animated.View entering={FadeInDown.delay(140)} style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, borderRadius: 18, padding: 16 }}>
              <Text style={{ color: t.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Carnation</Text>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>Fitzpatrick {result.skinTone.replace("fitzpatrick_", "")}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: t.primaryMuted, borderWidth: 0.5, borderColor: t.border, borderRadius: 18, padding: 16 }}>
              <Text style={{ color: t.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Saison</Text>
              <Text style={{ color: TERRACOTTA, fontSize: 16, fontWeight: "700" }}>{result.seasonLabel}</Text>
            </View>
          </Animated.View>

          {/* Palette */}
          <Animated.View entering={FadeInDown.delay(200)} style={{ backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, borderRadius: 18, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: t.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Tes couleurs à porter</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {palette.map((c) => (
                <View key={c} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: c }} />
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260)} style={{ gap: 10 }}>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={{ backgroundColor: TERRACOTTA, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>✓ Enregistrer dans mon profil</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep(0); setAnswers({}); setResult(null); }} style={{ borderWidth: 0.5, borderColor: t.border, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: TERRACOTTA, fontWeight: "600", fontSize: 14 }}>🔄 Refaire le test</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUESTION ──
  const q = QUIZ[step];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Header + progress */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
            <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, height: 6, backgroundColor: t.borderLight, borderRadius: 3, overflow: "hidden" }}>
            <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: TERRACOTTA, borderRadius: 3 }} />
          </View>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>{step + 1}/{QUIZ.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Animated.View key={q.id} entering={FadeInRight.duration(300)}>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: "700", lineHeight: 29, marginBottom: 8 }}>{q.question}</Text>
          {q.hint ? (
            <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 24 }}>💡 {q.hint}</Text>
          ) : <View style={{ height: 16 }} />}

          <View style={{ gap: 12 }}>
            {q.options.map((opt, i) => {
              const selected = answers[q.id]?.label === opt.label;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => handleAnswer(opt)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 14,
                    backgroundColor: selected ? t.primaryMuted : t.bgCard,
                    borderWidth: 0.5, borderColor: selected ? TERRACOTTA : t.border,
                    borderRadius: 16, padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{opt.emoji}</Text>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: "500", flex: 1 }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
