import { useCallback, useRef, useState } from "react";
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
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import {
  Canvas,
  Path,
  Circle,
  RoundedRect,
  RadialGradient,
  Skia,
  BlendMode,
  vec,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  interpolate,
  runOnUI,
} from "react-native-reanimated";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

// ─── Types ────────────────────────────────────────────────────────────────────

type MakeupLookType = "lipstick" | "blush" | "eyeliner" | "eyeshadow" | "foundation";

interface MakeupLook {
  type: MakeupLookType;
  label: string;
  emoji: string;
  color: string;
  intensity: number; // 0–1
  enabled: boolean;
  colors: { hex: string; name: string }[];
}

interface LandmarkPoint { x: number; y: number; }

interface CalibratedContours {
  upperLipTop: LandmarkPoint[];
  upperLipBottom: LandmarkPoint[];
  lowerLipTop: LandmarkPoint[];
  lowerLipBottom: LandmarkPoint[];
  leftEye: LandmarkPoint[];
  rightEye: LandmarkPoint[];
  leftEyebrow: LandmarkPoint[];
  rightEyebrow: LandmarkPoint[];
  leftCheek: LandmarkPoint;
  rightCheek: LandmarkPoint;
  faceBounds: { x: number; y: number; width: number; height: number };
}

// ─── Initial makeup looks ────────────────────────────────────────────────────

const INITIAL_LOOKS: MakeupLook[] = [
  {
    type: "lipstick", label: "Lèvres", emoji: "💄",
    color: "#C0392B", intensity: 0.7, enabled: true,
    colors: [
      { hex: "#C0392B", name: "Rouge" }, { hex: "#E8B4A0", name: "Nude" },
      { hex: "#8B2252", name: "Berry" }, { hex: "#E8734A", name: "Corail" },
      { hex: "#F4A8C0", name: "Rose" },  { hex: "#6D1A36", name: "Bordeaux" },
    ],
  },
  {
    type: "blush", label: "Blush", emoji: "🌸",
    color: "#F4A0B8", intensity: 0.5, enabled: false,
    colors: [
      { hex: "#F5B8A0", name: "Pêche" }, { hex: "#F4A0B8", name: "Rose" },
      { hex: "#E88070", name: "Corail" }, { hex: "#C87090", name: "Berry" },
    ],
  },
  {
    type: "eyeliner", label: "Eyeliner", emoji: "✏️",
    color: "#1A1A1A", intensity: 0.85, enabled: false,
    colors: [
      { hex: "#1A1A1A", name: "Noir" }, { hex: "#2C2C5A", name: "Navy" },
      { hex: "#3D2B1F", name: "Brun" }, { hex: "#7B5EA0", name: "Violet" },
    ],
  },
  {
    type: "eyeshadow", label: "Yeux", emoji: "👁️",
    color: "#C8A882", intensity: 0.6, enabled: false,
    colors: [
      { hex: "#C8A882", name: "Nude" }, { hex: "#8B6540", name: "Bronze" },
      { hex: "#5C4030", name: "Brun" }, { hex: "#7B5EA0", name: "Mauve" },
      { hex: "#2C2C2C", name: "Smoky" },
    ],
  },
  {
    type: "foundation", label: "Teint", emoji: "🎨",
    color: "#E8C8A0", intensity: 0.2, enabled: false,
    colors: [
      { hex: "#F5E0C8", name: "Porcelaine" }, { hex: "#E8C8A0", name: "Sable" },
      { hex: "#C8A070", name: "Beige" }, { hex: "#A07050", name: "Caramel" },
    ],
  },
];

// ─── Coordinate calibration ───────────────────────────────────────────────────

function calibratePoint(
  pt: { x: number; y: number },
  frameW: number,
  frameH: number,
  screenW: number,
  screenH: number
): LandmarkPoint {
  "worklet";
  // Front camera: x is mirrored
  const sx = (1 - pt.x / frameW) * screenW;
  const sy = (pt.y / frameH) * screenH;
  return { x: sx, y: sy };
}

function calibrateArray(
  pts: { x: number; y: number }[],
  frameW: number,
  frameH: number,
  screenW: number,
  screenH: number
): LandmarkPoint[] {
  "worklet";
  return pts.map((p) => calibratePoint(p, frameW, frameH, screenW, screenH));
}

// Linear interpolation for smoothing
function smoothPoints(
  prev: LandmarkPoint[],
  next: LandmarkPoint[],
  factor: number
): LandmarkPoint[] {
  "worklet";
  if (prev.length !== next.length) return next;
  return next.map((p, i) => ({
    x: interpolate(factor, [0, 1], [prev[i].x, p.x]),
    y: interpolate(factor, [0, 1], [prev[i].y, p.y]),
  }));
}

function buildClosedPath(points: LandmarkPoint[]): ReturnType<typeof Skia.Path.Make> {
  "worklet";
  const path = Skia.Path.Make();
  if (points.length < 2) return path;
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }
  path.close();
  return path;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  "worklet";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbaColor(hex: string, alpha: number): number {
  "worklet";
  const { r, g, b } = hexToRgb(hex);
  // Skia color: ARGB packed int
  const a = Math.round(alpha * 255);
  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TryOnScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const cameraContainerRef = useRef<View>(null);
  const [looks, setLooks] = useState<MakeupLook[]>(INITIAL_LOOKS);
  const [activeLookType, setActiveLookType] = useState<MakeupLookType>("lipstick");
  const [capturing, setCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  // Shared values for face contours (updated from frame processor)
  const contoursShared = useSharedValue<CalibratedContours | null>(null);
  const prevContours = useSharedValue<CalibratedContours | null>(null);

  // Makeup look shared values (updated from JS thread via runOnUI)
  const looksShared = useSharedValue<MakeupLook[]>(INITIAL_LOOKS);

  // Face detector
  const { detectFaces } = useFaceDetector({
    performanceMode: "fast",
    contourMode: "all",
    landmarkMode: "none",
    classificationMode: "none",
  });

  // Frame processor — runs on camera thread, no setState
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const faces = detectFaces(frame);
      if (faces.length === 0) {
        contoursShared.value = null;
        return;
      }

      const face = faces[0];
      const fw = frame.width;
      const fh = frame.height;

      const contours = face.contours;
      if (!contours) return;

      const cal: CalibratedContours = {
        upperLipTop: calibrateArray(contours.UPPER_LIP_TOP ?? [], fw, fh, W, H),
        upperLipBottom: calibrateArray(contours.UPPER_LIP_BOTTOM ?? [], fw, fh, W, H),
        lowerLipTop: calibrateArray(contours.LOWER_LIP_TOP ?? [], fw, fh, W, H),
        lowerLipBottom: calibrateArray(contours.LOWER_LIP_BOTTOM ?? [], fw, fh, W, H),
        leftEye: calibrateArray(contours.LEFT_EYE ?? [], fw, fh, W, H),
        rightEye: calibrateArray(contours.RIGHT_EYE ?? [], fw, fh, W, H),
        leftEyebrow: calibrateArray(contours.LEFT_EYEBROW_TOP ?? [], fw, fh, W, H),
        rightEyebrow: calibrateArray(contours.RIGHT_EYEBROW_TOP ?? [], fw, fh, W, H),
        leftCheek: contours.LEFT_CHEEK?.[0]
          ? calibratePoint(contours.LEFT_CHEEK[0], fw, fh, W, H)
          : { x: W * 0.25, y: H * 0.5 },
        rightCheek: contours.RIGHT_CHEEK?.[0]
          ? calibratePoint(contours.RIGHT_CHEEK[0], fw, fh, W, H)
          : { x: W * 0.75, y: H * 0.5 },
        faceBounds: face.bounds
          ? {
              x: (1 - (face.bounds.x + face.bounds.width) / fw) * W,
              y: (face.bounds.y / fh) * H,
              width: (face.bounds.width / fw) * W,
              height: (face.bounds.height / fh) * H,
            }
          : { x: W * 0.2, y: H * 0.15, width: W * 0.6, height: H * 0.65 },
      };

      // Smooth between frames
      const prev = prevContours.value;
      if (prev) {
        cal.upperLipTop = smoothPoints(prev.upperLipTop, cal.upperLipTop, 0.3);
        cal.lowerLipBottom = smoothPoints(prev.lowerLipBottom, cal.lowerLipBottom, 0.3);
        cal.leftEye = smoothPoints(prev.leftEye, cal.leftEye, 0.3);
        cal.rightEye = smoothPoints(prev.rightEye, cal.rightEye, 0.3);
      }

      prevContours.value = cal;
      contoursShared.value = cal;
    },
    [detectFaces, W, H]
  );

  // ── Skia derived paths ──────────────────────────────────────────────────────

  const lipPath = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    if (!c) return Skia.Path.Make();
    const allLipPoints = [
      ...c.upperLipTop,
      ...[...c.upperLipBottom].reverse(),
      ...c.lowerLipTop,
      ...[...c.lowerLipBottom].reverse(),
    ];
    return buildClosedPath(allLipPoints);
  });

  const leftEyePath = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    if (!c) return Skia.Path.Make();
    return buildClosedPath(c.leftEye);
  });

  const rightEyePath = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    if (!c) return Skia.Path.Make();
    return buildClosedPath(c.rightEye);
  });

  const leftEyeshadowPath = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    if (!c) return Skia.Path.Make();
    return buildClosedPath(c.leftEye.map((p) => ({ x: p.x, y: p.y - 15 })));
  });

  const rightEyeshadowPath = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    if (!c) return Skia.Path.Make();
    return buildClosedPath(c.rightEye.map((p) => ({ x: p.x, y: p.y - 15 })));
  });

  // Shared values for makeup colors/intensities
  const lipColor = useDerivedValue(() => {
    "worklet";
    const l = looksShared.value.find((x) => x.type === "lipstick");
    if (!l?.enabled) return 0x00000000;
    return rgbaColor(l.color, 0.6 * l.intensity);
  });

  const blushColor = useDerivedValue(() => {
    "worklet";
    const l = looksShared.value.find((x) => x.type === "blush");
    if (!l?.enabled) return 0x00000000;
    return rgbaColor(l.color, 0.3 * l.intensity);
  });

  const eyelinerColor = useDerivedValue(() => {
    "worklet";
    const l = looksShared.value.find((x) => x.type === "eyeliner");
    if (!l?.enabled) return 0x00000000;
    return rgbaColor(l.color, 0.85 * l.intensity);
  });

  const eyeshadowColor = useDerivedValue(() => {
    "worklet";
    const l = looksShared.value.find((x) => x.type === "eyeshadow");
    if (!l?.enabled) return 0x00000000;
    return rgbaColor(l.color, 0.55 * l.intensity);
  });

  const foundationColor = useDerivedValue(() => {
    "worklet";
    const l = looksShared.value.find((x) => x.type === "foundation");
    if (!l?.enabled) return 0x00000000;
    return rgbaColor(l.color, 0.18 * l.intensity);
  });

  const blushLeft = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    return c ? c.leftCheek : { x: W * 0.25, y: H * 0.5 };
  });

  const blushRight = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    return c ? c.rightCheek : { x: W * 0.75, y: H * 0.5 };
  });

  const faceBounds = useDerivedValue(() => {
    "worklet";
    const c = contoursShared.value;
    return c
      ? c.faceBounds
      : { x: W * 0.2, y: H * 0.15, width: W * 0.6, height: H * 0.65 };
  });

  // ── UI handlers ─────────────────────────────────────────────────────────────

  const toggleLook = useCallback((type: MakeupLookType) => {
    const updated = looks.map((l) =>
      l.type === type ? { ...l, enabled: !l.enabled } : l
    );
    setLooks(updated);
    runOnUI(() => { "worklet"; looksShared.value = updated; })();
  }, [looks]);

  const setColor = useCallback((type: MakeupLookType, color: string) => {
    const updated = looks.map((l) =>
      l.type === type ? { ...l, color, enabled: true } : l
    );
    setLooks(updated);
    runOnUI(() => { "worklet"; looksShared.value = updated; })();
  }, [looks]);

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

  // ── Permission / device guards ───────────────────────────────────────────────

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Caméra requise</Text>
        <Text style={styles.subtitle}>
          Lumis a besoin de ta caméra pour le Virtual Try-On.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.back}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>Caméra frontale non disponible.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.back}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeLook = looks.find((l) => l.type === activeLookType)!;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Camera + Skia overlay */}
      <View ref={cameraContainerRef} style={{ flex: 1 }} collapsable={false}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          frameProcessor={frameProcessor}
          frameProcessorFps={30}
          pixelFormat="yuv"
        />

        {/* Skia makeup overlay */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Foundation */}
          <RoundedRect
            x={faceBounds.value.x}
            y={faceBounds.value.y}
            width={faceBounds.value.width}
            height={faceBounds.value.height}
            r={faceBounds.value.width / 2}
            color={foundationColor}
            blendMode={BlendMode.Overlay}
          />

          {/* Eyeshadow */}
          <Path path={leftEyeshadowPath} color={eyeshadowColor} blendMode={BlendMode.Multiply} />
          <Path path={rightEyeshadowPath} color={eyeshadowColor} blendMode={BlendMode.Multiply} />

          {/* Blush — radial gradient circles */}
          <Circle cx={blushLeft.value.x} cy={blushLeft.value.y} r={60} color={blushColor} blendMode={BlendMode.Overlay}>
            <RadialGradient c={vec(blushLeft.value.x, blushLeft.value.y)} r={60} colors={[blushColor, 0x00000000]} />
          </Circle>
          <Circle cx={blushRight.value.x} cy={blushRight.value.y} r={60} color={blushColor} blendMode={BlendMode.Overlay}>
            <RadialGradient c={vec(blushRight.value.x, blushRight.value.y)} r={60} colors={[blushColor, 0x00000000]} />
          </Circle>

          {/* Eyeliner */}
          <Path path={leftEyePath} color={eyelinerColor} style="stroke" strokeWidth={2.5} blendMode={BlendMode.Multiply} />
          <Path path={rightEyePath} color={eyelinerColor} style="stroke" strokeWidth={2.5} blendMode={BlendMode.Multiply} />

          {/* Lipstick */}
          <Path path={lipPath} color={lipColor} blendMode={BlendMode.Multiply} />
        </Canvas>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Virtual Try-On</Text>
          <View style={{ width: 40 }}>
            {!faceDetected && (
              <View style={styles.noFaceDot} />
            )}
          </View>
        </View>

        {/* Face guide */}
        {!faceDetected && (
          <View style={styles.guideOverlay} pointerEvents="none">
            <Text style={styles.guideText}>Positionne ton visage dans le cadre</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <Animated.View
        entering={FadeInUp.delay(200)}
        style={styles.bottomPanel}
      >
        {/* Look chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {looks.map((look) => (
            <TouchableOpacity
              key={look.type}
              onPress={() => {
                setActiveLookType(look.type);
                if (!look.enabled) toggleLook(look.type);
              }}
              style={[
                styles.chip,
                activeLookType === look.type && styles.chipActive,
                look.enabled && activeLookType !== look.type && styles.chipEnabled,
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>{look.emoji}</Text>
              <Text style={[styles.chipLabel, activeLookType === look.type && styles.chipLabelActive]}>
                {look.label}
              </Text>
              {look.enabled && (
                <View style={styles.enabledDot} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Color palette for active look */}
        <View style={styles.paletteRow}>
          {activeLook.colors.map((c) => (
            <TouchableOpacity
              key={c.hex}
              onPress={() => setColor(activeLookType, c.hex)}
              style={[
                styles.swatch,
                { backgroundColor: c.hex },
                activeLook.color === c.hex && styles.swatchActive,
              ]}
              activeOpacity={0.8}
            />
          ))}
          {/* Toggle enable/disable */}
          <TouchableOpacity
            onPress={() => toggleLook(activeLookType)}
            style={[styles.toggleBtn, activeLook.enabled && styles.toggleBtnOn]}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleBtnText}>{activeLook.enabled ? "ON" : "OFF"}</Text>
          </TouchableOpacity>
        </View>

        {/* Capture */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            onPress={handleCapture}
            disabled={capturing}
            style={[styles.captureBtn, { opacity: capturing ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            {capturing ? (
              <ActivityIndicator color="#0A0A0A" size="small" />
            ) : (
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
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 15, textAlign: "center", marginBottom: 28 },
  btn: { backgroundColor: "#C9A84C", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  back: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20 },
  topTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  noFaceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#f87171", alignSelf: "center" },
  guideOverlay: { position: "absolute", bottom: "35%", left: 0, right: 0, alignItems: "center" },
  guideText: { color: "rgba(201,168,76,0.8)", fontSize: 13, textAlign: "center" },
  bottomPanel: { backgroundColor: "#0D0D0D", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingBottom: 32 },
  chipsContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: { backgroundColor: "rgba(201,168,76,0.2)", borderColor: "rgba(201,168,76,0.6)" },
  chipEnabled: { borderColor: "rgba(201,168,76,0.3)" },
  chipLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  chipLabelActive: { color: "#C9A84C" },
  enabledDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C9A84C", marginLeft: 2 },
  paletteRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  swatchActive: { borderWidth: 3, borderColor: "#C9A84C", width: 36, height: 36, borderRadius: 18 },
  toggleBtn: { marginLeft: "auto", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  toggleBtnOn: { borderColor: "#C9A84C", backgroundColor: "rgba(201,168,76,0.15)" },
  toggleBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  captureRow: { paddingHorizontal: 20 },
  captureBtn: {
    backgroundColor: "#C9A84C", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10,
    elevation: 6,
  },
  captureBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
});
