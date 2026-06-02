import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "../../services/api";
import { SkinScan } from "../../types/api";
import { PremiumGateModal } from "../../components/ui/PremiumGateModal";
import { SkinProgressChart } from "../../components/ui/SkinProgressChart";
import { useAuthStore } from "../../stores/auth.store";

// ─── Premium-only derived analysis ──────────────────────────────────────────
function estimateSkinAge(scan: SkinScan): number {
  let age = 28;
  age += Math.round((100 - scan.hydration_score) / 8);
  age += Math.round((100 - scan.texture_score) / 8);
  age += Math.round((100 - scan.uniformity_score) / 12);
  if (scan.fine_lines_detected) age += 5;
  age -= Math.round((scan.overall_score - 50) / 10);
  return Math.max(18, Math.min(70, age));
}

function zoneAnalysis(scan: SkinScan): { zone: string; state: string; color: string }[] {
  const has = (arr: string[] | undefined, ...keys: string[]) =>
    (arr ?? []).some((z) => keys.some((k) => z.toLowerCase().includes(k)));
  const out: { zone: string; state: string; color: string }[] = [];
  out.push(has(scan.oiliness_zones, "front", "t-zone")
    ? { zone: "Front", state: "Tendance grasse / brillance", color: "#fbbf24" }
    : { zone: "Front", state: "Équilibré", color: "#5DCAA5" });
  if (has(scan.dryness_zones, "joue")) out.push({ zone: "Joues", state: "Sécheresse à hydrater", color: "#60a5fa" });
  else if (has(scan.acne_zones, "joue")) out.push({ zone: "Joues", state: "Imperfections présentes", color: "#f87171" });
  else out.push({ zone: "Joues", state: "Bon état", color: "#5DCAA5" });
  out.push(has(scan.acne_zones, "menton")
    ? { zone: "Menton", state: "Acné hormonale possible", color: "#f87171" }
    : { zone: "Menton", state: "Net", color: "#5DCAA5" });
  out.push(scan.pores_condition === "larges"
    ? { zone: "Nez / Zone T", state: "Pores dilatés", color: "#fbbf24" }
    : { zone: "Nez / Zone T", state: "Pores fins", color: "#5DCAA5" });
  out.push(scan.fine_lines_detected
    ? { zone: "Contour des yeux", state: "Ridules détectées", color: "#fbbf24" }
    : { zone: "Contour des yeux", state: "Lisse", color: "#5DCAA5" });
  return out;
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#C9826B" : "#f87171";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${color}18`,
      }}
    >
      <Text style={{ color, fontWeight: "700", fontSize: size * 0.28 }}>{score}</Text>
      <Text style={{ color: `${color}90`, fontSize: size * 0.14 }}>/100</Text>
    </View>
  );
}

// ─── Score helpers ─────────────────────────────────────────────────────────────
// All scores use "high = good" convention (100 = perfect skin, 0 = severe issue)
function scoreLabel(score: number, type: "acne" | "hydration" | "texture" | "uniformity"): string {
  const levels: Record<typeof type, [string, string, string, string]> = {
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

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, score, icon, type }: {
  label: string; score: number; icon: string;
  type: "acne" | "hydration" | "texture" | "uniformity";
}) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#C9826B" : "#f87171";
  const qual = scoreLabel(score, type);
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-lumis-white/70 font-body text-sm">{icon} {label}</Text>
        <View className="flex-row items-center gap-2">
          <Text style={{ color, fontSize: 11 }} className="font-body">{qual}</Text>
          <Text style={{ color }} className="font-body-bold text-sm">{score}/100</Text>
        </View>
      </View>
      <View className="h-2 bg-white/8 rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({
  label, value, onChange, min, max, step = 0.5, unit, icon,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit: string; icon: string;
}) {
  return (
    <View className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-3">
      <Text className="text-lumis-white/50 font-body text-xs uppercase tracking-widest mb-3">
        {icon} {label}
      </Text>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, parseFloat((value - step).toFixed(1))))}
          className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-lumis-white text-xl font-bold">−</Text>
        </TouchableOpacity>
        <Text className="text-lumis-white font-display text-3xl">
          {value}<Text className="text-lumis-white/40 font-body text-base"> {unit}</Text>
        </Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, parseFloat((value + step).toFixed(1))))}
          className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-lumis-white text-xl font-bold">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Result screen ────────────────────────────────────────────────────────────
function ScanResults({ scan, onReset }: { scan: SkinScan; onReset: () => void }) {
  const { user } = useAuthStore();
  const isPremium = !!user?.premium_until && new Date(user.premium_until) > new Date();
  const skinAge = estimateSkinAge(scan);
  const zones = zoneAnalysis(scan);
  const potential = Math.min(95, scan.overall_score + 15);
  const date = new Date(scan.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  return (
    <ScrollView
      className="flex-1 bg-lumis-black"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0)} className="items-center mb-6">
        <View className="bg-lumis-gold/20 rounded-full px-4 py-1.5 mb-3">
          <Text className="text-lumis-gold font-body-medium text-xs">Analyse IA complète</Text>
        </View>
        <Text className="text-lumis-white font-display text-2xl text-center mb-1">Ton score peau</Text>
        <Text className="text-lumis-white/40 font-body text-xs">{date}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80)} className="items-center mb-6 bg-white/5 border border-white/10 rounded-3xl p-6">
        <ScoreRing score={scan.overall_score} size={100} />
        <Text className="text-lumis-white/50 font-body text-sm mt-3">Score global de santé</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160)} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-4">
        <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-4">Détail</Text>
        <ScoreBar label="Acné" score={scan.acne_score} icon="🔴" type="acne" />
        <ScoreBar label="Hydratation" score={scan.hydration_score} icon="💧" type="hydration" />
        <ScoreBar label="Texture" score={scan.texture_score} icon="✨" type="texture" />
        <ScoreBar label="Uniformité" score={scan.uniformity_score} icon="🎨" type="uniformity" />
      </Animated.View>

      {/* Priority actions */}
      <Animated.View entering={FadeInDown.delay(240)} className="bg-lumis-gold/8 border border-lumis-gold/25 rounded-3xl p-5 mb-4">
        <Text className="text-lumis-gold font-body text-xs uppercase tracking-widest mb-3">⚡ Priorités pour toi</Text>
        {buildPriorityActions(scan).map((action, i) => (
          <View key={i} className="flex-row items-start gap-3 mb-3">
            <View className="w-6 h-6 rounded-full bg-lumis-gold/20 items-center justify-center mt-0.5" style={{ minWidth: 24 }}>
              <Text style={{ color: "#C9826B", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lumis-white font-body-medium text-sm mb-0.5">{action.title}</Text>
              <Text className="text-lumis-white/50 font-body text-xs leading-5">{action.desc}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Indicateurs qualitatifs */}
      <Animated.View entering={FadeInDown.delay(300)} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-4">
        <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-4">Indicateurs qualitatifs</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          <Tag label={`Pores ${scan.pores_condition}`} warn={scan.pores_condition === "larges"} />
          <Tag label={`Rougeurs ${scan.redness_level}`} warn={scan.redness_level === "élevé"} />
          <Tag label={`Hyperpig. ${scan.hyperpigmentation_level}`} warn={scan.hyperpigmentation_level === "élevé"} />
          {scan.acne_count > 0 && <Tag label={`${scan.acne_count} imperfection${scan.acne_count > 1 ? "s" : ""}`} warn />}
          {scan.dark_spots_count > 0 && <Tag label={`${scan.dark_spots_count} tache${scan.dark_spots_count > 1 ? "s" : ""}`} warn />}
          {scan.fine_lines_detected && <Tag label="Ridules détectées" warn />}
        </View>

        {scan.acne_zones && scan.acne_zones.length > 0 && (
          <View className="mb-3">
            <Text className="text-lumis-white/40 font-body text-xs mb-2">🔴 Zones acnéiques</Text>
            <View className="flex-row flex-wrap gap-2">
              {scan.acne_zones.map((z) => <Tag key={z} label={z} warn />)}
            </View>
          </View>
        )}
        {scan.dryness_zones && scan.dryness_zones.length > 0 && (
          <View className="mb-3">
            <Text className="text-lumis-white/40 font-body text-xs mb-2">💧 Zones sèches</Text>
            <View className="flex-row flex-wrap gap-2">
              {scan.dryness_zones.map((z) => <Tag key={z} label={z} />)}
            </View>
          </View>
        )}
        {scan.oiliness_zones && scan.oiliness_zones.length > 0 && (
          <View>
            <Text className="text-lumis-white/40 font-body text-xs mb-2">✨ Zones grasses</Text>
            <View className="flex-row flex-wrap gap-2">
              {scan.oiliness_zones.map((z) => <Tag key={z} label={z} warn />)}
            </View>
          </View>
        )}
      </Animated.View>

      {/* ─── ANALYSE PREMIUM ─── */}
      <Animated.View entering={FadeInDown.delay(300)} className="mb-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-lumis-gold font-body text-xs uppercase tracking-widest">💎 Analyse approfondie</Text>
          {!isPremium && (
            <View style={{ backgroundColor: "rgba(201,130,107,0.2)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ color: "#C9826B", fontSize: 9, fontWeight: "700" }}>PREMIUM</Text>
            </View>
          )}
        </View>

        <View style={{ position: "relative" }}>
          {/* Premium content */}
          <View style={{ opacity: isPremium ? 1 : 0.25 }} pointerEvents={isPremium ? "auto" : "none"}>
            {/* Skin age + potential */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
                <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1">Âge cutané estimé</Text>
                <Text style={{ color: "#C9826B", fontSize: 28, fontWeight: "700" }}>{skinAge}<Text style={{ fontSize: 13, color: "rgba(232,213,192,0.4)" }}> ans</Text></Text>
              </View>
              <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
                <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1">Potentiel (8 sem.)</Text>
                <Text style={{ color: "#5DCAA5", fontSize: 28, fontWeight: "700" }}>{potential}<Text style={{ fontSize: 13, color: "rgba(232,213,192,0.4)" }}>/100</Text></Text>
              </View>
            </View>

            {/* Zone-by-zone */}
            <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-3">Analyse zone par zone</Text>
              <View style={{ gap: 10 }}>
                {zones.map((z, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: "rgba(232,213,192,0.7)", fontSize: 13 }}>{z.zone}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: z.color }} />
                      <Text style={{ color: z.color, fontSize: 12, fontWeight: "500" }}>{z.state}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Lock overlay for free users */}
          {!isPremium && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ backgroundColor: "rgba(13,13,15,0.85)", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, alignItems: "center", borderWidth: 0.5, borderColor: "rgba(201,130,107,0.4)" }}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>🔒</Text>
                <Text style={{ color: "#E8D5C0", fontSize: 14, fontWeight: "700", marginBottom: 2 }}>Analyse approfondie</Text>
                <Text style={{ color: "rgba(232,213,192,0.5)", fontSize: 12, textAlign: "center", marginBottom: 12 }}>Âge cutané, analyse par zone et potentiel</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/premium" as any)} style={{ backgroundColor: "#C9826B", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ color: "#0D0D0F", fontWeight: "700", fontSize: 13 }}>Débloquer avec Premium</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(340)} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6">
        <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-3">Données saisies</Text>
        <View className="flex-row gap-3">
          <LifestyleTile icon="🌙" label="Sommeil" value={`${scan.sleep_hours}h`} />
          <LifestyleTile icon="💦" label="Eau" value={`${scan.water_intake_liters}L`} />
          <LifestyleTile icon="😰" label="Stress" value={`${scan.stress_level}/10`} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400)} className="gap-3">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)")}
          className="bg-lumis-gold rounded-xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-lumis-black font-body-bold text-base">🏠 Retour à l'accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onReset}
          className="border border-lumis-gold/40 rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-lumis-gold font-body-medium text-base">📸 Nouveau scan</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// Génère les top 3 priorités basées sur les scores réels
function buildPriorityActions(scan: SkinScan): { title: string; desc: string }[] {
  const actions: { score: number; title: string; desc: string }[] = [];

  if (scan.acne_score < 70) {
    actions.push({
      score: 100 - scan.acne_score,
      title: "Traiter l'acné avec du niacinamide",
      desc: `Ton score acné est ${scan.acne_score}/100. Applique un sérum niacinamide 10% matin et soir pour réduire le sébum et les imperfections.`,
    });
  }
  if (scan.hydration_score < 65) {
    actions.push({
      score: 100 - scan.hydration_score,
      title: "Booster l'hydratation immédiatement",
      desc: `Hydratation à ${scan.hydration_score}/100. Utilise de l'acide hyaluronique sur peau humide avant ta crème. Bois minimum 2L d'eau par jour.`,
    });
  }
  if (scan.texture_score < 65) {
    actions.push({
      score: 100 - scan.texture_score,
      title: "Lisser la texture avec des AHA",
      desc: `Texture à ${scan.texture_score}/100. Introduis un exfoliant chimique (AHA/glycolique) 2-3x par semaine le soir pour accélérer le renouvellement cellulaire.`,
    });
  }
  if (scan.uniformity_score < 65) {
    actions.push({
      score: 100 - scan.uniformity_score,
      title: "Uniformiser le teint avec la vitamine C",
      desc: `Uniformité à ${scan.uniformity_score}/100. Applique de la vitamine C (10-20%) chaque matin pour réduire les taches et illuminer le teint.`,
    });
  }
  if (scan.redness_level === "élevé") {
    actions.push({
      score: 80,
      title: "Calmer les rougeurs avec centella asiatica",
      desc: "Rougeurs élevées détectées. Évite les produits avec alcool et parfum. Utilise un soin à la centella asiatica ou à l'acide azélaïque.",
    });
  }
  if (scan.sleep_hours < 6) {
    actions.push({
      score: 60,
      title: "Améliorer le sommeil (impact direct sur la peau)",
      desc: `Tu dors ${scan.sleep_hours}h/nuit. Le renouvellement cellulaire se fait pendant le sommeil. Vise 7-8h pour améliorer texture et acné.`,
    });
  }
  if (scan.stress_level >= 7) {
    actions.push({
      score: 50,
      title: "Réduire le stress (cortisol = sébum)",
      desc: `Stress à ${scan.stress_level}/10. Le cortisol stimule les glandes sébacées et aggrave l'acné. Méditation, exercice ou respiration profonde.`,
    });
  }

  // Toujours recommander le SPF
  if (actions.length < 3) {
    actions.push({
      score: 30,
      title: "SPF 50+ chaque matin sans exception",
      desc: "Le soleil est responsable de 80% du vieillissement cutané. Un SPF 50+ fluide protège et préserve tous tes acquis.",
    });
  }

  // Trier par priorité et garder les 3 plus importantes
  return actions.sort((a, b) => b.score - a.score).slice(0, 3);
}

function Tag({ label, warn }: { label: string; warn?: boolean }) {
  return (
    <View className={`rounded-full px-3 py-1 ${warn ? "bg-orange-500/15 border border-orange-500/30" : "bg-white/8 border border-white/15"}`}>
      <Text className={`font-body text-xs ${warn ? "text-orange-400" : "text-lumis-white/60"}`}>{label}</Text>
    </View>
  );
}

function LifestyleTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 items-center">
      <Text className="text-xl mb-1">{icon}</Text>
      <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-0.5">{label}</Text>
      <Text className="text-lumis-white font-body-bold text-sm">{value}</Text>
    </View>
  );
}

// ─── Scanning loader ──────────────────────────────────────────────────────────
const SCAN_TEXTS = [
  "L'IA examine ta peau…",
  "Détection des imperfections…",
  "Analyse de l'hydratation…",
  "Évaluation de la texture…",
  "Calcul du score global…",
];

function ScanningLoader({ photoUri }: { photoUri: string | null }) {
  const [textIdx, setTextIdx] = useState(0);
  const scannerY = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    scannerY.value = withRepeat(
      withSequence(
        withTiming(200, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    const interval = setInterval(() => setTextIdx((i) => (i + 1) % SCAN_TEXTS.length), 1200);
    return () => clearInterval(interval);
  }, []);

  const scannerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scannerY.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black items-center justify-center px-6"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <Animated.View entering={FadeIn.duration(300)} className="items-center w-full">
        {/* Photo avec scanner animé */}
        <View className="relative w-56 h-56 rounded-3xl overflow-hidden mb-8 border-2 border-lumis-gold/40">
          {photoUri ? (
            <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full bg-white/5 items-center justify-center">
              <Text className="text-4xl">🤳</Text>
            </View>
          )}
          <View className="absolute inset-0 bg-lumis-black/30" />
          <Animated.View style={scannerStyle} className="absolute left-0 right-0">
            <View className="h-0.5 bg-lumis-gold" />
            <View className="h-10" style={{ backgroundColor: "rgba(201,168,76,0.08)" }} />
          </Animated.View>
          {/* Coins */}
          <View className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-lumis-gold" />
          <View className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-lumis-gold" />
          <View className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-lumis-gold" />
          <View className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-lumis-gold" />
        </View>

        <Animated.View style={pulseStyle} className="items-center">
          <Text className="text-lumis-gold font-display text-2xl mb-3">Analyse IA ✨</Text>
        </Animated.View>

        <Animated.Text
          key={textIdx}
          entering={FadeIn.duration(400)}
          className="text-lumis-white/60 font-body text-sm text-center mb-8"
        >
          {SCAN_TEXTS[textIdx]}
        </Animated.Text>

        {/* Barre de progression indéterminée */}
        <View className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <Animated.View
            className="h-full bg-lumis-gold rounded-full"
            style={{ width: "40%" }}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function HistoryCard({ scan, onPress }: { scan: SkinScan; onPress: () => void }) {
  const color = scan.overall_score >= 75 ? "#4ade80" : scan.overall_score >= 50 ? "#C9826B" : "#f87171";
  const date = new Date(scan.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-row items-center gap-4"
    >
      <View style={{ borderColor: color }} className="w-14 h-14 rounded-full border-2 items-center justify-center">
        <Text style={{ color }} className="font-body-bold text-lg">{scan.overall_score}</Text>
        <Text style={{ color: `${color}80`, fontSize: 9 }}>/100</Text>
      </View>
      <View className="flex-1">
        <Text className="text-lumis-white font-body-medium text-sm mb-0.5">{date}</Text>
        <Text className="text-lumis-white/40 font-body text-xs">
          Acné {scan.acne_score} · Hydra {scan.hydration_score} · Texture {scan.texture_score}
        </Text>
      </View>
      <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
type ScreenView = "photo" | "form" | "result" | "history";

export default function ScanScreen() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ScreenView>("photo");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sleep, setSleep] = useState(7);
  const [water, setWater] = useState(1.5);
  const [stress, setStress] = useState(5);
  const [latestResult, setLatestResult] = useState<SkinScan | null>(null);
  const [premiumGate, setPremiumGate] = useState<{ used: number; limit: number } | null>(null);

  const { data: history = [], isLoading: historyLoading, isFetching: historyFetching, refetch: refetchHistory } = useQuery({
    queryKey: ["skin-history"],
    queryFn: () => api.getSkinHistory(),
    staleTime: 0,
  });

  // Refetch every time the user opens the history view
  const prevView = useRef<ScreenView>("photo");
  useEffect(() => {
    if (view === "history" && prevView.current !== "history") {
      refetchHistory();
    }
    prevView.current = view;
  }, [view]);

  const analyzeMutation = useMutation({
    mutationFn: () =>
      api.analyzeSkin({
        sleep_hours: sleep,
        stress_level: stress,
        water_intake_liters: water,
        photo_base64: photoBase64 ?? undefined,
      }),
    onSuccess: (scan) => {
      setLatestResult(scan);
      setView("result");
      queryClient.invalidateQueries({ queryKey: ["skin-history"] });
      queryClient.invalidateQueries({ queryKey: ["skin-scan", "latest"] });
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { status?: number; data?: { used?: number; limit?: number } } };
      if (apiErr?.response?.status === 402) {
        setPremiumGate({
          used: apiErr.response?.data?.used ?? 3,
          limit: apiErr.response?.data?.limit ?? 3,
        });
      } else {
        Alert.alert("Erreur", "L'analyse a échoué. Réessaie.");
      }
    },
  });

  const pickPhoto = async (source: "camera" | "library") => {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission refusée", "Autorise l'accès à la caméra dans les paramètres."); return; }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres."); return; }
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      }
      if (!res.canceled && res.assets[0]) {
        const uri = res.assets[0].uri;
        setPhotoUri(uri);
        // compress + base64
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 512 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        setPhotoBase64(`data:image/jpeg;base64,${compressed.base64}`);
        setView("form");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de charger la photo.");
    }
  };

  const handleReset = () => {
    setView("photo");
    setPhotoUri(null);
    setPhotoBase64(null);
    setLatestResult(null);
  };

  // ── Scanning (loading) ──
  if (analyzeMutation.isPending) {
    return <ScanningLoader photoUri={photoUri} />;
  }

  // ── Result ──
  if (view === "result" && latestResult) {
    return (
      <SafeAreaView className="flex-1 bg-lumis-black" style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}>
        <ScanResults scan={latestResult} onReset={handleReset} />
      </SafeAreaView>
    );
  }

  const premiumGateModal = (
    <PremiumGateModal
      visible={premiumGate !== null}
      onClose={() => setPremiumGate(null)}
      title="Limite atteinte"
      message="Tu as utilisé tes 3 scans gratuits ce mois-ci. Passe à Premium pour des scans illimités."
      used={premiumGate?.used}
      limit={premiumGate?.limit}
    />
  );

  // ── History ──
  if (view === "history") {
    return (
      <SafeAreaView className="flex-1 bg-lumis-black" style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}>
        <View className="px-6 pt-4 pb-3 flex-row items-center gap-3 border-b border-white/8">
          <TouchableOpacity onPress={() => setView("photo")} className="w-8 h-8 items-center justify-center">
            <Text className="text-lumis-white/60 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-lumis-white font-display text-xl flex-1">Historique scans</Text>
          {history.length >= 2 && (
            <TouchableOpacity
              onPress={() => router.push("/scan/compare")}
              style={{ backgroundColor: "rgba(201,168,76,0.15)", borderWidth: 0.5, borderColor: "rgba(201,168,76,0.4)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <Text style={{ color: "#C9826B", fontSize: 11, fontWeight: "600" }}>⇄ Comparer</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={historyFetching && !historyLoading} onRefresh={refetchHistory} tintColor="#C9826B" />}
        >
          {historyLoading || historyFetching ? (
            <View className="items-center py-20">
              <ActivityIndicator color="#C9826B" size="large" />
            </View>
          ) : history.length > 0 ? (
            <View className="gap-3">
              {/* Graphique d'évolution */}
              <Animated.View entering={FadeInDown.delay(0)}
                style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 20, marginBottom: 4 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  📈 Évolution de ta peau
                </Text>
                <SkinProgressChart scans={history} />
              </Animated.View>

              {history.map((s, i) => (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 40 + 100)}>
                  <HistoryCard
                    scan={s}
                    onPress={() => router.push(`/scan/${s.id}` as any)}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <View className="items-center py-20">
              <Text className="text-4xl mb-4">📊</Text>
              <Text className="text-lumis-white/60 font-display text-lg mb-2">Aucun scan</Text>
              <Text className="text-lumis-white/30 font-body text-sm text-center mb-8">
                Fais ton premier scan pour voir ton historique ici
              </Text>
              <TouchableOpacity
                onPress={() => setView("photo")}
                className="bg-lumis-gold rounded-xl px-8 py-4"
                activeOpacity={0.85}
              >
                <Text className="text-lumis-black font-body-bold text-base">📸 Faire mon premier scan</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Photo capture step ──
  if (view === "photo") {
    return (
      <>
        {premiumGateModal}
      <SafeAreaView className="flex-1 bg-lumis-black" style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(0)} className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-lumis-white font-display text-3xl">Skin Tracker</Text>
              <Text className="text-lumis-white/50 font-body text-sm mt-1">Analyse IA de ta peau</Text>
            </View>
            {history && history.length > 0 && (
              <TouchableOpacity onPress={() => setView("history")} className="bg-white/8 border border-white/15 rounded-xl px-3 py-2">
                <Text className="text-lumis-white/60 font-body text-xs">📊 Historique</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Photo guide */}
          <Animated.View entering={FadeInDown.delay(80)} className="items-center mb-8">
            <View className="w-48 h-48 rounded-3xl border-2 border-lumis-gold/40 items-center justify-center bg-white/5 mb-5">
              <Text className="text-6xl mb-2">🤳</Text>
              <Text className="text-lumis-white/40 font-body text-xs text-center px-6">
                Photo de ton visage ou d'une zone
              </Text>
            </View>
            <View className="flex-row gap-4 mb-2">
              {["☀️ Bonne lumière", "😐 Face caméra", "🚫 Sans filtre"].map((tip) => (
                <View key={tip} className="bg-white/5 rounded-xl py-2 px-2 items-center flex-1">
                  <Text className="text-lumis-white/40 font-body text-[10px] text-center">{tip}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160)} className="gap-3">
            <TouchableOpacity
              onPress={() => pickPhoto("camera")}
              className="bg-lumis-gold rounded-2xl py-4 items-center flex-row justify-center gap-3"
              activeOpacity={0.85}
            >
              <Text className="text-2xl">📷</Text>
              <Text className="text-lumis-black font-body-bold text-base">Prendre une photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickPhoto("library")}
              className="border border-lumis-gold/40 rounded-2xl py-4 items-center flex-row justify-center gap-3"
              activeOpacity={0.85}
            >
              <Text className="text-2xl">🖼️</Text>
              <Text className="text-lumis-gold font-body-medium text-base">Choisir une photo</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      </>
    );
  }

  // ── Form step (lifestyle data) ──
  return (
    <>
      {premiumGateModal}
    <SafeAreaView className="flex-1 bg-lumis-black" style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header with photo thumbnail */}
        <Animated.View entering={FadeIn} className="flex-row items-center gap-4 mb-6">
          <TouchableOpacity onPress={() => setView("photo")} className="w-8 h-8 items-center justify-center">
            <Text className="text-lumis-white/60 text-xl">←</Text>
          </TouchableOpacity>
          {photoUri && (
            <Image source={{ uri: photoUri }} className="w-12 h-12 rounded-2xl" style={{ borderWidth: 2, borderColor: "rgba(201,168,76,0.4)" }} />
          )}
          <View className="flex-1">
            <Text className="text-lumis-white font-display text-xl">Données du jour</Text>
            <Text className="text-lumis-white/40 font-body text-xs">
              {photoBase64 ? "Photo prête · Analyse IA activée ✨" : "Sans photo — scoring lifestyle"}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80)}>
          <Stepper label="Heures de sommeil" value={sleep} onChange={setSleep} min={1} max={12} step={0.5} unit="h" icon="🌙" />
          <Stepper label="Eau bue aujourd'hui" value={water} onChange={setWater} min={0} max={4} step={0.25} unit="L" icon="💦" />
          <Stepper label="Niveau de stress" value={stress} onChange={setStress} min={1} max={10} step={1} unit="/10" icon="😰" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} className="mt-4">
          <TouchableOpacity
            onPress={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="bg-lumis-gold rounded-2xl py-4 items-center"
            activeOpacity={0.85}
            style={{ opacity: analyzeMutation.isPending ? 0.7 : 1 }}
          >
            {analyzeMutation.isPending ? (
              <View className="flex-row items-center gap-3">
                <ActivityIndicator color="#0D0D0F" size="small" />
                <Text className="text-lumis-black font-body-bold text-base">
                  {photoBase64 ? "IA analyse ta peau…" : "Analyse en cours…"}
                </Text>
              </View>
            ) : (
              <Text className="text-lumis-black font-body-bold text-base">
                {photoBase64 ? "✨ Analyser avec l'IA" : "📊 Analyser"}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}
