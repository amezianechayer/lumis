import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  FadeInDown, FadeIn, ZoomIn,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withRepeat, withSequence, Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../services/api";
import { SkinScan } from "../../types/api";
import { SkinDiagnosticCard } from "../../components/ui/SkinDiagnosticCard";
import { useAuthStore } from "../../stores/auth.store";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

function scoreColor(s: number) {
  return s >= 75 ? "#4ade80" : s >= 50 ? "#C9826B" : "#f87171";
}

function scoreLabel(score: number, type: "acne" | "hydration" | "texture" | "uniformity"): string {
  const levels = {
    acne:       ["Aucune", "Légère", "Modérée", "Sévère"],
    hydration:  ["Excellente", "Bonne", "Moyenne", "Faible"],
    texture:    ["Lisse", "Bonne", "Irrégulière", "Rugueuse"],
    uniformity: ["Uniforme", "Bonne", "Inégale", "Très inégale"],
  };
  const [l0, l1, l2, l3] = levels[type];
  if (score >= 80) return l0;
  if (score >= 60) return l1;
  if (score >= 40) return l2;
  return l3;
}

function ScoreRow({ label, score, type, icon, delay = 0 }: {
  label: string; score: number; icon: string;
  type: "acne" | "hydration" | "texture" | "uniformity";
  delay?: number;
}) {
  const c = useThemeColors();
  const color = scoreColor(score);
  const qual = scoreLabel(score, type);
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(score, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: c.text, fontSize: 14 }}>{icon} {label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color, fontSize: 11 }}>{qual}</Text>
          <Text style={{ color, fontWeight: "700", fontSize: 14 }}>{score}/100</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: c.borderLight, borderRadius: 4, overflow: "hidden" }}>
        <Animated.View style={[{ height: "100%", backgroundColor: color, borderRadius: 4 }, barStyle]} />
      </View>
    </Animated.View>
  );
}

function TagList({ label, items, color }: { label: string; items: string[]; color: string }) {
  const c = useThemeColors();
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {items.map((item, i) => (
          <View key={i} style={{ backgroundColor: `${color}20`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: `${color}40` }}>
            <Text style={{ color, fontSize: 12 }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function OverallScoreCard({ overall, oc }: { overall: number; oc: string }) {
  const c = useThemeColors();
  const pulse = useSharedValue(1);
  const countVal = useSharedValue(0);

  useEffect(() => {
    // Animate the score counting up
    countVal.value = withTiming(overall, { duration: 1200, easing: Easing.out(Easing.cubic) });
    // Pulse the ring
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View entering={ZoomIn.duration(500).springify()} style={{
      backgroundColor: `${oc}10`, borderWidth: 0.5, borderColor: `${oc}30`,
      borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 20,
    }}>
      <Animated.View style={[{
        width: 110, height: 110, borderRadius: 55, borderWidth: 4,
        borderColor: oc, backgroundColor: `${oc}18`,
        alignItems: "center", justifyContent: "center", marginBottom: 12,
      }, ringStyle]}>
        <Text style={{ color: oc, fontWeight: "800", fontSize: 36 }}>{overall}</Text>
        <Text style={{ color: `${oc}80`, fontSize: 12 }}>/100</Text>
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(400)} style={{ color: oc, fontWeight: "700", fontSize: 18 }}>
        {overall >= 80 ? "Excellente santé" : overall >= 65 ? "Bonne santé" : overall >= 50 ? "À améliorer" : "Besoins importants"}
      </Animated.Text>
      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>Score global de peau</Text>
    </Animated.View>
  );
}

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const isPremium = !!user?.premium_until && new Date(user.premium_until) > new Date();

  const { data: scan, isLoading, isError } = useQuery<SkinScan>({
    queryKey: ["scan-detail", id],
    queryFn: async () => {
      const history = await api.getSkinHistory();
      const found = history.find((s: SkinScan) => s.id === id);
      if (!found) throw new Error("Scan non trouvé");
      return found;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={TERRACOTTA} size="large" />
      </SafeAreaView>
    );
  }

  if (isError || !scan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ color: "#ef4444", fontSize: 16, marginBottom: 16 }}>Scan introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: TERRACOTTA, fontWeight: "600" }}>← Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const date = new Date(scan.created_at).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const overall = scan.overall_score;
  const oc = scoreColor(overall);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Détail du scan</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{date}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Overall score with pulse ring */}
        <OverallScoreCard overall={overall} oc={oc} />

        {/* AI diagnostic (Aroma-Zone style) — same as the live result */}
        {scan.ai_analysis && <SkinDiagnosticCard diagnostic={scan.ai_analysis} isPremium={isPremium} />}

        {/* Sub-scores */}
        <Animated.View entering={FadeInDown.delay(80)} style={{
          backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight,
          borderRadius: 20, padding: 20, marginBottom: 16,
        }}>
          <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Métriques détaillées</Text>
          <ScoreRow label="Acné" score={scan.acne_score} icon="🔴" type="acne" delay={0} />
          <ScoreRow label="Hydratation" score={scan.hydration_score} icon="💧" type="hydration" delay={80} />
          <ScoreRow label="Texture" score={scan.texture_score} icon="✨" type="texture" delay={160} />
          <ScoreRow label="Uniformité" score={scan.uniformity_score} icon="🎨" type="uniformity" delay={240} />
        </Animated.View>

        {/* Qualitative indicators */}
        <Animated.View entering={FadeInDown.delay(140)} style={{
          backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight,
          borderRadius: 20, padding: 20, marginBottom: 16,
        }}>
          <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Indicateurs qualitatifs</Text>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Rougeur", val: scan.redness_level },
              { label: "Pores", val: scan.pores_condition },
              { label: "Hyperpigmentation", val: scan.hyperpigmentation_level },
            ].map(({ label, val }) => (
              <View key={label} style={{ backgroundColor: c.primaryMuted, borderRadius: 12, padding: 12, flex: 1, minWidth: 90 }}>
                <Text style={{ color: c.textMuted, fontSize: 10, marginBottom: 4 }}>{label}</Text>
                <Text style={{ color: c.text, fontWeight: "600", fontSize: 13, textTransform: "capitalize" }}>{val || "—"}</Text>
              </View>
            ))}
          </View>
          {scan.fine_lines_detected && (
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 14 }}>〰️</Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>Fines lignes détectées</Text>
            </View>
          )}
        </Animated.View>

        {/* Zones */}
        <Animated.View entering={FadeInDown.delay(200)} style={{
          backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight,
          borderRadius: 20, padding: 20, marginBottom: 16,
        }}>
          <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Zones concernées</Text>
          <TagList label="Acné" items={scan.acne_zones ?? []} color="#f87171" />
          <TagList label="Sécheresse" items={scan.dryness_zones ?? []} color="#60a5fa" />
          <TagList label="Brillance" items={scan.oiliness_zones ?? []} color="#C9826B" />
        </Animated.View>

        {/* Lifestyle */}
        <Animated.View entering={FadeInDown.delay(260)} style={{
          backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight,
          borderRadius: 20, padding: 20,
        }}>
          <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Lifestyle au moment du scan</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: c.primaryMuted, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20 }}>😴</Text>
              <Text style={{ color: c.text, fontWeight: "700", fontSize: 18, marginTop: 4 }}>{scan.sleep_hours}h</Text>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>Sommeil</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.primaryMuted, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20 }}>💧</Text>
              <Text style={{ color: c.text, fontWeight: "700", fontSize: 18, marginTop: 4 }}>{scan.water_intake_liters}L</Text>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>Eau</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.primaryMuted, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 20 }}>🌡️</Text>
              <Text style={{ color: c.text, fontWeight: "700", fontSize: 18, marginTop: 4 }}>{scan.stress_level}/10</Text>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>Stress</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
