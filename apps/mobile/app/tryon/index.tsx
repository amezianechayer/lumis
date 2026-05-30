import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { router } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

type MakeupLookType = "lipstick" | "gloss" | "blush" | "eyeshadow" | "foundation";

interface MakeupLook {
  type: MakeupLookType;
  label: string;
  emoji: string;
  color: string;
  enabled: boolean;
  colors: { hex: string; name: string }[];
}

const INITIAL_LOOKS: MakeupLook[] = [
  {
    type: "lipstick", label: "Lèvres", emoji: "💄",
    color: "#C0392B", enabled: true,
    colors: [
      { hex: "#C0392B", name: "Rouge" }, { hex: "#E8B4A0", name: "Nude" },
      { hex: "#8B2252", name: "Berry" }, { hex: "#E8734A", name: "Corail" },
      { hex: "#F4A8C0", name: "Rose" }, { hex: "#6D1A36", name: "Bordeaux" },
    ],
  },
  {
    type: "gloss", label: "Gloss", emoji: "✨",
    color: "#F2C4B8", enabled: false,
    colors: [
      { hex: "#F2C4B8", name: "Nude" }, { hex: "#F5A0B8", name: "Pink" },
      { hex: "#D44040", name: "Red" }, { hex: "#F08060", name: "Corail" },
    ],
  },
  {
    type: "blush", label: "Blush", emoji: "🌸",
    color: "#F4A0B8", enabled: false,
    colors: [
      { hex: "#F5B8A0", name: "Pêche" }, { hex: "#F4A0B8", name: "Rose" },
      { hex: "#E88070", name: "Corail" }, { hex: "#C87090", name: "Berry" },
    ],
  },
  {
    type: "eyeshadow", label: "Yeux", emoji: "👁️",
    color: "#C8A882", enabled: false,
    colors: [
      { hex: "#C8A882", name: "Nude" }, { hex: "#8B6540", name: "Bronze" },
      { hex: "#5C4030", name: "Brun" }, { hex: "#7B5EA0", name: "Mauve" },
      { hex: "#2C2C2C", name: "Smoky" },
    ],
  },
  {
    type: "foundation", label: "Teint", emoji: "🎨",
    color: "#E8C8A0", enabled: false,
    colors: [
      { hex: "#F5E0C8", name: "Porcelaine" }, { hex: "#E8C8A0", name: "Sable" },
      { hex: "#C8A070", name: "Beige" }, { hex: "#A07050", name: "Caramel" },
    ],
  },
];

// ── Overlay component — positioned relative to face oval ──────────────────────

function MakeupOverlay({
  looks, ovalTop, ovalLeft, ovalWidth, ovalHeight,
}: {
  looks: MakeupLook[];
  ovalTop: number; ovalLeft: number; ovalWidth: number; ovalHeight: number;
}) {
  const cx = ovalLeft + ovalWidth / 2;
  const oh = ovalHeight;
  const oy = ovalTop;

  return (
    <>
      {/* Foundation */}
      {looks.find(l => l.type === "foundation")?.enabled && (() => {
        const l = looks.find(l => l.type === "foundation")!;
        return (
          <View pointerEvents="none" style={{
            position: "absolute", top: oy, left: ovalLeft,
            width: ovalWidth, height: oh, borderRadius: ovalWidth / 2,
            backgroundColor: l.color, opacity: 0.18,
          }} />
        );
      })()}

      {/* Eyeshadow */}
      {looks.find(l => l.type === "eyeshadow")?.enabled && (() => {
        const l = looks.find(l => l.type === "eyeshadow")!;
        const eyeW = ovalWidth * 0.18; const eyeH = oh * 0.04;
        const eyeTop = oy + oh * 0.31;
        return (
          <>
            <View pointerEvents="none" style={{ position: "absolute", top: eyeTop, left: ovalLeft + ovalWidth * 0.18, width: eyeW, height: eyeH * 2.5, borderRadius: eyeH, backgroundColor: l.color, opacity: 0.55 }} />
            <View pointerEvents="none" style={{ position: "absolute", top: eyeTop, left: ovalLeft + ovalWidth * 0.62, width: eyeW, height: eyeH * 2.5, borderRadius: eyeH, backgroundColor: l.color, opacity: 0.55 }} />
          </>
        );
      })()}

      {/* Blush */}
      {looks.find(l => l.type === "blush")?.enabled && (() => {
        const l = looks.find(l => l.type === "blush")!;
        const r = ovalWidth * 0.14;
        const blushTop = oy + oh * 0.50;
        return (
          <>
            <View pointerEvents="none" style={{ position: "absolute", top: blushTop - r, left: ovalLeft + ovalWidth * 0.06 - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: l.color, opacity: 0.3 }} />
            <View pointerEvents="none" style={{ position: "absolute", top: blushTop - r, left: ovalLeft + ovalWidth * 0.94 - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: l.color, opacity: 0.3 }} />
          </>
        );
      })()}

      {/* Lipstick / Gloss */}
      {(looks.find(l => l.type === "lipstick")?.enabled || looks.find(l => l.type === "gloss")?.enabled) && (() => {
        const l = looks.find(l => l.type === "lipstick")?.enabled
          ? looks.find(l => l.type === "lipstick")!
          : looks.find(l => l.type === "gloss")!;
        const lipW = ovalWidth * 0.26; const lipH = oh * 0.05;
        const lipTop = oy + oh * 0.70;
        const opacity = l.type === "gloss" ? 0.5 : 0.65;
        return (
          <>
            <View pointerEvents="none" style={{ position: "absolute", top: lipTop, left: cx - lipW / 2, width: lipW, height: lipH * 0.9, borderRadius: lipH, backgroundColor: l.color, opacity }} />
            <View pointerEvents="none" style={{ position: "absolute", top: lipTop + lipH * 0.7, left: cx - lipW * 0.52, width: lipW * 1.04, height: lipH * 1.1, borderRadius: lipH, backgroundColor: l.color, opacity }} />
          </>
        );
      })()}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TryOnScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [looks, setLooks] = useState<MakeupLook[]>(INITIAL_LOOKS);
  const [activeLookType, setActiveLookType] = useState<MakeupLookType>("lipstick");
  const [capturing, setCapturing] = useState(false);
  const cameraContainerRef = useRef<View>(null);

  const ovalW = W * 0.62;
  const ovalH = H * 0.52;
  const ovalLeft = (W - ovalW) / 2;
  const ovalTop = H * 0.07;

  const activeLook = looks.find(l => l.type === activeLookType)!;

  const toggleLook = (type: MakeupLookType) => {
    setLooks(prev => prev.map(l => l.type === type ? { ...l, enabled: !l.enabled } : l));
  };

  const setColor = (type: MakeupLookType, color: string) => {
    setLooks(prev => prev.map(l => l.type === type ? { ...l, color, enabled: true } : l));
  };

  const handleCapture = useCallback(async () => {
    setCapturing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Autorise l'accès à la galerie.");
        return;
      }
      const uri = await captureRef(cameraContainerRef, { format: "jpg", quality: 0.92 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("📸 Sauvegardé !", "Le look a été enregistré dans ta galerie.");
    } catch {
      Alert.alert("Erreur", "Impossible de capturer le look.");
    } finally {
      setCapturing(false);
    }
  }, []);

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Caméra requise</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Autoriser</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.back}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View ref={cameraContainerRef} style={{ flex: 1 }} collapsable={false}>
        <CameraView style={StyleSheet.absoluteFill} facing="front" />

        {/* Face oval guide */}
        <View pointerEvents="none" style={[styles.oval, {
          width: ovalW, height: ovalH,
          left: ovalLeft, top: ovalTop,
          borderRadius: ovalW / 2,
        }]} />

        {/* Makeup overlays */}
        <MakeupOverlay
          looks={looks}
          ovalTop={ovalTop} ovalLeft={ovalLeft}
          ovalWidth={ovalW} ovalHeight={ovalH}
        />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Virtual Try-On</Text>
          <View style={{ width: 40 }} />
        </View>

        <View pointerEvents="none" style={styles.guideHint}>
          <Text style={styles.guideText}>Aligne ton visage dans l'ovale</Text>
        </View>
      </View>

      {/* Bottom panel */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.bottomPanel}>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {looks.map(look => (
            <TouchableOpacity
              key={look.type}
              onPress={() => { setActiveLookType(look.type); if (!look.enabled) toggleLook(look.type); }}
              style={[styles.chip, activeLookType === look.type && styles.chipActive, look.enabled && activeLookType !== look.type && styles.chipOn]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>{look.emoji}</Text>
              <Text style={[styles.chipLabel, activeLookType === look.type && styles.chipLabelActive]}>
                {look.label}
              </Text>
              {look.enabled && <View style={styles.dot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.paletteRow}>
          {activeLook.colors.map(c => (
            <TouchableOpacity
              key={c.hex}
              onPress={() => setColor(activeLookType, c.hex)}
              style={[styles.swatch, { backgroundColor: c.hex }, activeLook.color === c.hex && styles.swatchActive]}
              activeOpacity={0.8}
            />
          ))}
          <TouchableOpacity onPress={() => toggleLook(activeLookType)} style={[styles.toggleBtn, activeLook.enabled && styles.toggleBtnOn]}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{activeLook.enabled ? "ON" : "OFF"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={handleCapture} disabled={capturing} style={[styles.captureBtn, { opacity: capturing ? 0.7 : 1 }]} activeOpacity={0.85}>
            {capturing ? <ActivityIndicator color="#0A0A0A" size="small" /> : (
              <>
                <Text style={{ fontSize: 20 }}>📸</Text>
                <Text style={styles.captureBtnText}>Capturer le look</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center", padding: 32 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#C9A84C", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  oval: { position: "absolute", borderWidth: 2, borderColor: "rgba(201,168,76,0.5)", borderStyle: "dashed" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, backgroundColor: "rgba(0,0,0,0.3)" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20 },
  topTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  guideHint: { position: "absolute", bottom: "34%", left: 0, right: 0, alignItems: "center" },
  guideText: { color: "rgba(201,168,76,0.7)", fontSize: 12 },
  bottomPanel: { backgroundColor: "#0D0D0D", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingBottom: 32 },
  chipsRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" },
  chipActive: { backgroundColor: "rgba(201,168,76,0.2)", borderColor: "rgba(201,168,76,0.6)" },
  chipOn: { borderColor: "rgba(201,168,76,0.3)" },
  chipLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  chipLabelActive: { color: "#C9A84C" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C9A84C" },
  paletteRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  swatchActive: { borderWidth: 3, borderColor: "#C9A84C", width: 36, height: 36, borderRadius: 18 },
  toggleBtn: { marginLeft: "auto", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  toggleBtnOn: { borderColor: "#C9A84C", backgroundColor: "rgba(201,168,76,0.15)" },
  captureBtn: { backgroundColor: "#C9A84C", borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, elevation: 6 },
  captureBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
});
