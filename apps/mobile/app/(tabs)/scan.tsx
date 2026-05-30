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

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#C9A96E" : "#f87171";
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

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#C9A96E" : "#f87171";
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-lumis-white/70 font-body text-sm">{icon} {label}</Text>
        <Text style={{ color }} className="font-body-bold text-sm">{score}/100</Text>
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
        <ScoreBar label="Acné" score={scan.acne_score} icon="🔴" />
        <ScoreBar label="Hydratation" score={scan.hydration_score} icon="💧" />
        <ScoreBar label="Texture" score={scan.texture_score} icon="✨" />
        <ScoreBar label="Uniformité" score={scan.uniformity_score} icon="🎨" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240)} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-4">
        <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-4">Insights</Text>
        <View className="flex-row flex-wrap gap-2">
          <Tag label={`Pores ${scan.pores_condition}`} />
          <Tag label={`Rougeurs ${scan.redness_level}`} />
          <Tag label={`Hyperpig. ${scan.hyperpigmentation_level}`} />
          {scan.acne_count > 0 && <Tag label={`${scan.acne_count} imperfections`} warn />}
          {scan.dark_spots_count > 0 && <Tag label={`${scan.dark_spots_count} taches`} warn />}
          {scan.fine_lines_detected && <Tag label="Fines rides" warn />}
        </View>
        {scan.acne_zones && scan.acne_zones.length > 0 && (
          <View className="mt-4">
            <Text className="text-lumis-white/40 font-body text-xs mb-2">Zones acné :</Text>
            <View className="flex-row flex-wrap gap-2">
              {scan.acne_zones.map((z) => <Tag key={z} label={z} warn />)}
            </View>
          </View>
        )}
        {scan.dryness_zones && scan.dryness_zones.length > 0 && (
          <View className="mt-3">
            <Text className="text-lumis-white/40 font-body text-xs mb-2">Zones sèches :</Text>
            <View className="flex-row flex-wrap gap-2">
              {scan.dryness_zones.map((z) => <Tag key={z} label={z} />)}
            </View>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320)} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6">
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

function HistoryCard({ scan }: { scan: SkinScan }) {
  const color = scan.overall_score >= 75 ? "#4ade80" : scan.overall_score >= 50 ? "#C9A96E" : "#f87171";
  const date = new Date(scan.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return (
    <View className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-row items-center gap-4">
      <View style={{ borderColor: color }} className="w-14 h-14 rounded-full border-2 items-center justify-center">
        <Text style={{ color }} className="font-body-bold text-lg">{scan.overall_score}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-lumis-white font-body-medium text-sm mb-0.5">{date}</Text>
        <Text className="text-lumis-white/40 font-body text-xs">
          Acné {scan.acne_score} · Hydra {scan.hydration_score} · Texture {scan.texture_score}
        </Text>
      </View>
    </View>
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
          <Text className="text-lumis-white/30 font-body text-xs">{history.length} scan{history.length > 1 ? "s" : ""}</Text>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={historyFetching && !historyLoading} onRefresh={refetchHistory} tintColor="#C9A84C" />}
        >
          {historyLoading || historyFetching ? (
            <View className="items-center py-20">
              <ActivityIndicator color="#C9A84C" size="large" />
            </View>
          ) : history.length > 0 ? (
            <View className="gap-3">
              {history.map((s, i) => (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 40)}>
                  <HistoryCard scan={s} />
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
                <ActivityIndicator color="#0A0A0A" size="small" />
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
