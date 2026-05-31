import { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSkinAnalysis } from "../../hooks/useSkinAnalysis";
import { SkinAnalysisResult as SkinAnalysisResultData } from "../../services/gemini";

export default function SkinAnalysisScreen() {
  const { width: W } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const hasPermission = permission?.granted ?? false;

  const {
    phase, countdown, geminiResult, localResult,
    photoUri, error, lightingWarning, lowConfidenceWarning,
    startAnalysis, reset,
  } = useSkinAnalysis(cameraRef);

  const isAnalyzing = phase === "countdown" || phase === "capturing" || phase === "local_analysis" || phase === "gemini_analysis";

  // ── Permission ──────────────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Caméra requise</Text>
        <Text style={styles.subtitle}>Autorise l'accès pour analyser ta peau.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Autoriser</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>Caméra non disponible.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === "done" && geminiResult) {
    return <SkinAnalysisResult result={geminiResult} onRetry={reset} />;
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={styles.title}>{lightingWarning ? "Éclairage insuffisant" : "Analyse échouée"}</Text>
        <Text style={styles.subtitle}>{error}</Text>
        <TouchableOpacity onPress={reset} style={styles.btn}>
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera view ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Face oval guide */}
      <View pointerEvents="none" style={[styles.ovalGuide, {
        width: W * 0.65, height: W * 0.85,
        left: (W - W * 0.65) / 2, top: "10%",
      }]} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Analyse de peau</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Guide instruction */}
      {phase === "idle" && (
        <Animated.View entering={FadeIn} style={styles.guideBox}>
          <Text style={styles.guideLine}>☀️ Lumière naturelle</Text>
          <Text style={styles.guideLine}>📱 Face à la caméra</Text>
          <Text style={styles.guideLine}>🚫 Pas de maquillage</Text>
        </Animated.View>
      )}

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownText}>Reste immobile…</Text>
        </View>
      )}

      {/* Analyzing overlay */}
      {isAnalyzing && phase !== "countdown" && (
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.analyzingText}>
            {phase === "capturing" && "Capture en cours…"}
            {phase === "local_analysis" && "Analyse locale…"}
            {phase === "gemini_analysis" && "Analyse IA Gemini…"}
          </Text>
        </View>
      )}

      {/* Bottom CTA */}
      {phase === "idle" && (
        <Animated.View entering={FadeInDown} style={styles.bottomCTA}>
          <Text style={styles.ctaHint}>
            Place ton visage dans l'ovale — capture automatique dans 3s
          </Text>
          <TouchableOpacity onPress={startAnalysis} style={styles.ctaBtn} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>Analyser ma peau</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Result component ─────────────────────────────────────────────────────────

function SkinAnalysisResult({
  result,
  onRetry,
}: {
  result: SkinAnalysisResultData;
  onRetry: () => void;
}) {
  const concernLevel = (v: string | null) => {
    if (!v || v === "none") return null;
    const colors: Record<string, string> = { mild: "#C9A84C", moderate: "#f97316", severe: "#ef4444" };
    return colors[v] ?? "#94a3b8";
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0A0A0A" }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0)} style={{ marginBottom: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "#C9A84C", fontSize: 15 }}>← Retour</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 4 }}>
          Résultats de l'analyse
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          ⚕️ Résultats indicatifs, non médicaux
        </Text>

        {result.confidence < 0.5 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Résultat peu fiable — réessaie en meilleure lumière
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Skin type + tone */}
      <Animated.View entering={FadeInDown.delay(80)} style={styles.card}>
        <Text style={styles.cardLabel}>Type de peau</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: result.dominantHex, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }} />
          <View>
            <Text style={styles.cardValue}>{result.skinType ?? "—"}</Text>
            <Text style={styles.cardSub}>
              Fitzpatrick {result.fitzpatrickType} · {result.undertone}
            </Text>
          </View>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{Math.round(result.confidence * 100)}%</Text>
          </View>
        </View>
      </Animated.View>

      {/* Visible concerns */}
      <Animated.View entering={FadeInDown.delay(140)} style={styles.card}>
        <Text style={styles.cardLabel}>Concernés visibles</Text>
        <View style={{ gap: 8 }}>
          {Object.entries(result.visibleConcerns).map(([key, val]) => {
            const color = concernLevel(val);
            if (!color) return null;
            return (
              <View key={key} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                  {CONCERN_LABELS[key] ?? key}
                </Text>
                <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{val}</Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Morning routine */}
      {result.skincareRoutine.morning.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <Text style={styles.cardLabel}>☀️ Routine matin</Text>
          {result.skincareRoutine.morning.map((step, i) => (
            <View key={i} style={styles.routineStep}>
              <View style={styles.stepNum}><Text style={{ color: "#C9A84C", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Evening routine */}
      {result.skincareRoutine.evening.length > 0 && (
        <Animated.View entering={FadeInDown.delay(260)} style={styles.card}>
          <Text style={styles.cardLabel}>🌙 Routine soir</Text>
          {result.skincareRoutine.evening.map((step, i) => (
            <View key={i} style={styles.routineStep}>
              <View style={styles.stepNum}><Text style={{ color: "#C9A84C", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Product categories */}
      {result.productCategories.length > 0 && (
        <Animated.View entering={FadeInDown.delay(320)} style={styles.card}>
          <Text style={styles.cardLabel}>Produits recommandés</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {result.productCategories.map((cat) => (
              <View key={cat} style={styles.catChip}>
                <Text style={styles.catChipText}>{cat}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Retry */}
      <Animated.View entering={FadeInDown.delay(380)}>
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.8}>
          <Text style={styles.retryText}>🔄 Nouvelle analyse</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const CONCERN_LABELS: Record<string, string> = {
  acne: "Acné",
  darkSpots: "Taches sombres",
  pores: "Pores",
  wrinkles: "Ridules",
  redness: "Rougeurs",
  dryness: "Sécheresse",
};

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center", padding: 32 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 15, textAlign: "center", marginBottom: 24 },
  btn: { backgroundColor: "#C9A84C", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  backText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20 },
  ovalGuide: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(201,168,76,0.55)",
    borderStyle: "dashed",
  },
  guideBox: {
    position: "absolute", bottom: "28%", left: 0, right: 0,
    alignItems: "center", gap: 4,
  },
  guideLine: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  countdownNumber: { color: "#C9A84C", fontSize: 96, fontWeight: "800" },
  countdownText: { color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 8 },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  analyzingText: { color: "#C9A84C", fontSize: 16, fontWeight: "600" },
  bottomCTA: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 40, backgroundColor: "rgba(0,0,0,0.7)",
  },
  ctaHint: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginBottom: 12 },
  ctaBtn: {
    backgroundColor: "#C9A84C", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", elevation: 6,
  },
  ctaBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
  warningBanner: { backgroundColor: "rgba(249,115,22,0.15)", borderWidth: 1, borderColor: "rgba(249,115,22,0.3)", borderRadius: 10, padding: 10, marginTop: 8 },
  warningText: { color: "#f97316", fontSize: 13 },
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  cardValue: { color: "#fff", fontSize: 18, fontWeight: "700", textTransform: "capitalize" },
  cardSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  confidenceBadge: { marginLeft: "auto", backgroundColor: "rgba(201,168,76,0.2)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { color: "#C9A84C", fontSize: 13, fontWeight: "700" },
  routineStep: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(201,168,76,0.2)", alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepText: { color: "rgba(255,255,255,0.75)", fontSize: 14, flex: 1, lineHeight: 20 },
  catChip: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  catChipText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  retryBtn: { borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  retryText: { color: "#C9A84C", fontSize: 15, fontWeight: "600" },
});
