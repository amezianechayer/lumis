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
  Image,
} from "react-native";
import { router } from "expo-router";
import Animated, { FadeInUp, FadeIn, FadeInDown } from "react-native-reanimated";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { captureRef } from "react-native-view-shot";
import Svg, { Polygon, Polyline, Circle, Ellipse, Path, Defs, RadialGradient, LinearGradient, Stop } from "react-native-svg";
import MediaPipeWebView, { MediaPipeRef } from "../../components/FaceAnalyzer/MediaPipeWebView";

type MakeupLookType = "lipstick" | "blush" | "eyeshadow" | "highlighter" | "foundation";

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
    type: "blush", label: "Blush", emoji: "🌸",
    color: "#F4A0B8", enabled: true,
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
    type: "highlighter", label: "Highlight", emoji: "✨",
    color: "#FFF0D0", enabled: false,
    colors: [
      { hex: "#FFF0D0", name: "Champagne" }, { hex: "#FFE8C0", name: "Doré" },
      { hex: "#FFEAEA", name: "Rosé" }, { hex: "#F5F5FF", name: "Glacé" },
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

// ─── MediaPipe Face Mesh landmark indices ─────────────────────────────────────
// Outer lip contour
const LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
// Face oval contour (for foundation)
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
// Cheek centers (blush)
const LEFT_CHEEK = 50;
const RIGHT_CHEEK = 280;
// Eye landmarks for eyeshadow placement (upper lid region)
const LEFT_EYE_TOP = 159;   // upper lid center
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
// Upper lash line (for eyeliner) — left then right eye, outer→inner
const LEFT_UPPER_LID = [33, 246, 161, 160, 159, 158, 157, 173, 133];
const RIGHT_UPPER_LID = [362, 398, 384, 385, 386, 387, 388, 466, 263];
// Inner + outer lip for gloss separation
const LOWER_LIP_CENTER = 17;
// Highlighter points: high cheekbones, nose bridge, cupid's bow, brow bone
const HL_CHEEK_L = 117;
const HL_CHEEK_R = 346;
const HL_NOSE_TOP = 197;
const HL_NOSE_TIP = 4;
const HL_CUPID = 0;

type Pt = [number, number, number]; // x, y, z (normalized 0-1)

// ─── Makeup overlay rendered on detected landmarks ────────────────────────────
function MakeupMesh({
  landmarks, looks, w, h, intensity,
}: {
  landmarks: Pt[];
  looks: MakeupLook[];
  w: number; h: number;
  intensity: number; // 0.6 = naturel, 1 = moyen, 1.4 = glam
}) {
  const px = (i: number) => landmarks[i][0] * w;
  const py = (i: number) => landmarks[i][1] * h;
  const op = (base: number) => Math.min(1, base * intensity);

  const lip = looks.find(l => l.type === "lipstick");
  const blush = looks.find(l => l.type === "blush");
  const eye = looks.find(l => l.type === "eyeshadow");
  const hl = looks.find(l => l.type === "highlighter");
  const found = looks.find(l => l.type === "foundation");

  // Lip polygon points
  const lipPoints = LIPS_OUTER.map(i => `${px(i)},${py(i)}`).join(" ");
  const facePoints = FACE_OVAL.map(i => `${px(i)},${py(i)}`).join(" ");

  // Cheek positions + radius (proportional to face width)
  const faceW = Math.abs(px(454) - px(234));
  const blushR = faceW * 0.15;

  // Eye dimensions
  const leftEyeW = Math.abs(px(LEFT_EYE_OUTER) - px(LEFT_EYE_INNER));
  const rightEyeW = Math.abs(px(RIGHT_EYE_OUTER) - px(RIGHT_EYE_INNER));

  // Eyeliner paths (follow the upper lash line)
  const leftLiner = LEFT_UPPER_LID.map(i => `${px(i)},${py(i)}`).join(" ");
  const rightLiner = RIGHT_UPPER_LID.map(i => `${px(i)},${py(i)}`).join(" ");
  const linerW = Math.max(1.5, faceW * 0.012);

  // Gloss highlight position (center of lower lip)
  const glossX = px(LOWER_LIP_CENTER);
  const glossY = py(LOWER_LIP_CENTER) - faceW * 0.015;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={blush?.color ?? "#F4A0B8"} stopOpacity={op(0.5)} />
          <Stop offset="60%" stopColor={blush?.color ?? "#F4A0B8"} stopOpacity={op(0.25)} />
          <Stop offset="100%" stopColor={blush?.color ?? "#F4A0B8"} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="eyeGradL" cx="50%" cy="60%" r="55%">
          <Stop offset="0%" stopColor={eye?.color ?? "#C8A882"} stopOpacity={op(0.65)} />
          <Stop offset="100%" stopColor={eye?.color ?? "#C8A882"} stopOpacity={0.05} />
        </RadialGradient>
        <RadialGradient id="eyeGradR" cx="50%" cy="60%" r="55%">
          <Stop offset="0%" stopColor={eye?.color ?? "#C8A882"} stopOpacity={op(0.65)} />
          <Stop offset="100%" stopColor={eye?.color ?? "#C8A882"} stopOpacity={0.05} />
        </RadialGradient>
        <RadialGradient id="hlGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={hl?.color ?? "#FFF0D0"} stopOpacity={op(0.6)} />
          <Stop offset="100%" stopColor={hl?.color ?? "#FFF0D0"} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lip?.color ?? "#C0392B"} stopOpacity={op(0.78)} />
          <Stop offset="100%" stopColor={lip?.color ?? "#C0392B"} stopOpacity={op(0.58)} />
        </LinearGradient>
      </Defs>

      {/* Foundation — light evening overlay */}
      {found?.enabled && (
        <Polygon points={facePoints} fill={found.color} fillOpacity={0.16} />
      )}

      {/* Blush — soft natural radial on cheeks */}
      {blush?.enabled && (
        <>
          <Circle cx={px(LEFT_CHEEK)} cy={py(LEFT_CHEEK)} r={blushR} fill="url(#blushGrad)" />
          <Circle cx={px(RIGHT_CHEEK)} cy={py(RIGHT_CHEEK)} r={blushR} fill="url(#blushGrad)" />
        </>
      )}

      {/* Eyeshadow — graded ellipses on the lids */}
      {eye?.enabled && (
        <>
          <Ellipse
            cx={px(LEFT_EYE_TOP)} cy={py(LEFT_EYE_TOP) - leftEyeW * 0.1}
            rx={leftEyeW * 0.62} ry={leftEyeW * 0.4}
            fill="url(#eyeGradL)"
          />
          <Ellipse
            cx={px(RIGHT_EYE_TOP)} cy={py(RIGHT_EYE_TOP) - rightEyeW * 0.1}
            rx={rightEyeW * 0.62} ry={rightEyeW * 0.4}
            fill="url(#eyeGradR)"
          />
          {/* Eyeliner + mascara — dark lash line */}
          <Polyline points={leftLiner} fill="none" stroke="#1A1209" strokeWidth={linerW} strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={rightLiner} fill="none" stroke="#1A1209" strokeWidth={linerW} strokeOpacity={0.85} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {/* Highlighter — luminous points on cheekbones, nose bridge, cupid's bow */}
      {hl?.enabled && (
        <>
          <Ellipse cx={px(HL_CHEEK_L)} cy={py(HL_CHEEK_L)} rx={faceW * 0.07} ry={faceW * 0.035} fill="url(#hlGrad)" />
          <Ellipse cx={px(HL_CHEEK_R)} cy={py(HL_CHEEK_R)} rx={faceW * 0.07} ry={faceW * 0.035} fill="url(#hlGrad)" />
          <Ellipse cx={px(HL_NOSE_TOP)} cy={(py(HL_NOSE_TOP) + py(HL_NOSE_TIP)) / 2} rx={faceW * 0.022} ry={Math.abs(py(HL_NOSE_TIP) - py(HL_NOSE_TOP)) * 0.5} fill="url(#hlGrad)" />
          <Ellipse cx={px(HL_CUPID)} cy={py(HL_CUPID)} rx={faceW * 0.03} ry={faceW * 0.015} fill="url(#hlGrad)" />
        </>
      )}

      {/* Lipstick — gradient fill + contour + gloss */}
      {lip?.enabled && (
        <>
          <Polygon points={lipPoints} fill="url(#lipGrad)" />
          {/* Defined lip contour */}
          <Polygon points={lipPoints} fill="none" stroke={lip.color} strokeOpacity={op(0.85)} strokeWidth={linerW * 0.7} strokeLinejoin="round" />
          {/* Gloss highlight on lower lip */}
          <Ellipse cx={glossX} cy={glossY} rx={faceW * 0.05} ry={faceW * 0.018} fill="#FFFFFF" fillOpacity={op(0.25)} />
        </>
      )}
    </Svg>
  );
}

type Phase = "intro" | "detecting" | "result";

export default function TryOnScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>("intro");
  const [looks, setLooks] = useState<MakeupLook[]>(INITIAL_LOOKS);
  const [activeLookType, setActiveLookType] = useState<MakeupLookType>("lipstick");
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDims, setPhotoDims] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [landmarks, setLandmarks] = useState<Pt[] | null>(null);
  const [mpReady, setMpReady] = useState(false);
  const [intensity, setIntensity] = useState(1); // 0.6 naturel, 1 moyen, 1.4 glam

  const mediaPipeRef = useRef<MediaPipeRef>(null);
  const captureViewRef = useRef<View>(null);

  const activeLook = looks.find(l => l.type === activeLookType)!;

  // Displayed photo dimensions (fit width)
  const dispW = W;
  const dispH = photoDims.h > 0 ? W * (photoDims.h / photoDims.w) : H * 0.7;

  const toggleLook = (type: MakeupLookType) => {
    setLooks(prev => prev.map(l => l.type === type ? { ...l, enabled: !l.enabled } : l));
  };

  const setColor = (type: MakeupLookType, color: string) => {
    setLooks(prev => prev.map(l => l.type === type ? { ...l, color, enabled: true } : l));
  };

  // ── Pick photo (native camera or gallery) + run face detection ───────────────
  const handlePickImage = useCallback(async (source: "camera" | "gallery") => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission refusée", "Autorise l'accès à la caméra dans les paramètres.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: "images", cameraType: ImagePicker.CameraType.front, quality: 0.9,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission refusée", "Autorise l'accès à la galerie.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.9 });
      }

      if (result.canceled || !result.assets?.[0]) return;

      setPhase("detecting");
      setLandmarks(null);

      // Resize for faster, reliable MediaPipe processing
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 720 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setPhotoUri(manipulated.uri);
      setPhotoDims({ w: manipulated.width, h: manipulated.height });

      if (manipulated.base64 && mediaPipeRef.current) {
        const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;
        mediaPipeRef.current.analyzeImage(dataUri);
        setTimeout(() => {
          setPhase(p => (p === "detecting" ? "result" : p));
        }, 8000);
      } else {
        setPhase("result");
      }
    } catch (e) {
      console.warn("[TryOn] photo error:", e);
      Alert.alert("Erreur", "Impossible de charger la photo. Réessaie.");
      setPhase("intro");
    }
  }, []);

  const handleLandmarks = useCallback((pts: number[][]) => {
    setLandmarks(pts as Pt[]);
    setPhase("result");
  }, []);

  const handleMpError = useCallback((msg: string) => {
    console.warn("[TryOn] MediaPipe:", msg);
    if (msg === "no_face_detected") {
      Alert.alert("Visage non détecté", "Assure-toi que ton visage est bien visible et éclairé, puis réessaie.");
      setPhase("intro");
      setPhotoUri(null);
    } else {
      // Show photo anyway, makeup mesh just won't render
      setPhase("result");
    }
  }, []);

  // ── Save final look ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setCapturing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Autorise l'accès à la galerie pour sauvegarder.");
        return;
      }
      // captureRef works here because we capture a static Image + SVG, not a live camera surface
      const uri = await captureRef(captureViewRef, { format: "jpg", quality: 0.95 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("📸 Sauvegardé !", "Ton look a été enregistré dans ta galerie.");
    } catch (e) {
      console.warn("[TryOn] save error:", e);
      Alert.alert("Erreur", "Impossible de sauvegarder le look.");
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleRetake = () => {
    setPhotoUri(null);
    setLandmarks(null);
    setPhase("intro");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Hidden MediaPipe processor */}
      <MediaPipeWebView
        ref={mediaPipeRef}
        onLandmarks={handleLandmarks}
        onError={handleMpError}
        onReady={() => setMpReady(true)}
      />

      {/* ── INTRO PHASE ── */}
      {phase === "intro" && (
        <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle}>Virtual Try-On</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <Animated.View entering={FadeInDown} style={{ alignItems: "center", marginBottom: 40 }}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>💄</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 10 }}>
                Essaie ton maquillage
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", lineHeight: 21 }}>
                Prends un selfie ou choisis une photo. L'IA détecte ton visage et applique le maquillage sur tes vrais traits.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120)} style={{ width: "100%", gap: 12 }}>
              <TouchableOpacity
                onPress={() => handlePickImage("camera")}
                disabled={!mpReady}
                style={[styles.bigBtn, { opacity: mpReady ? 1 : 0.5 }]}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 22 }}>📸</Text>
                <Text style={styles.bigBtnText}>Prendre un selfie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePickImage("gallery")}
                disabled={!mpReady}
                style={[styles.bigBtnOutline, { opacity: mpReady ? 1 : 0.5 }]}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 20 }}>🖼️</Text>
                <Text style={styles.bigBtnOutlineText}>Choisir une photo</Text>
              </TouchableOpacity>

              {!mpReady && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
                  <ActivityIndicator color="#C9A84C" size="small" />
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Chargement de la détection faciale…</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200)} style={{ marginTop: 32, flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center" }}>
                💡 Astuce : bonne lumière + visage de face = meilleur résultat
              </Text>
            </Animated.View>
          </View>
        </View>
      )}

      {/* ── DETECTING PHASE ── */}
      {phase === "detecting" && (
        <View style={styles.center}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={3} />
          )}
          <View style={styles.detectOverlay}>
            <ActivityIndicator color="#C9A84C" size="large" />
            <Text style={styles.detectText}>Détection de ton visage…</Text>
          </View>
        </View>
      )}

      {/* ── RESULT PHASE ── */}
      {phase === "result" && photoUri && (
        <>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleRetake} style={styles.backBtn}>
              <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle}>Ton look</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingTop: 100, paddingBottom: 32 }}>
            {/* Captured photo + makeup mesh */}
            <View ref={captureViewRef} collapsable={false} style={{ width: dispW, height: dispH, alignSelf: "center" }}>
              <Image source={{ uri: photoUri }} style={{ width: dispW, height: dispH }} resizeMode="cover" />
              {landmarks && (
                <MakeupMesh landmarks={landmarks} looks={looks} w={dispW} h={dispH} intensity={intensity} />
              )}
            </View>

            {!landmarks && (
              <Animated.View entering={FadeIn} style={styles.noFaceBanner}>
                <Text style={styles.noFaceText}>
                  ⚠️ Visage non détecté précisément — le maquillage n'a pas pu être appliqué. Réessaie avec un meilleur éclairage.
                </Text>
              </Animated.View>
            )}

            {/* Look chips */}
            <Animated.View entering={FadeInUp.delay(100)}>
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
                    <Text style={[styles.chipLabel, activeLookType === look.type && styles.chipLabelActive]}>{look.label}</Text>
                    {look.enabled && <View style={styles.dot} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Intensity presets */}
              <View style={styles.intensityRow}>
                <Text style={styles.intensityLabel}>Intensité</Text>
                {([["Naturel", 0.6], ["Moyen", 1], ["Glam", 1.4]] as const).map(([label, val]) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setIntensity(val)}
                    style={[styles.intensityBtn, intensity === val && styles.intensityBtnActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.intensityText, intensity === val && styles.intensityTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color palette */}
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

              {/* Actions */}
              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                <TouchableOpacity onPress={handleSave} disabled={capturing} style={[styles.captureBtn, { opacity: capturing ? 0.7 : 1 }]} activeOpacity={0.85}>
                  {capturing ? <ActivityIndicator color="#0A0A0A" size="small" /> : (
                    <>
                      <Text style={{ fontSize: 18 }}>📸</Text>
                      <Text style={styles.captureBtnText}>Sauvegarder le look</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRetake} style={styles.retakeBtn} activeOpacity={0.8}>
                  <Text style={styles.retakeText}>🔄 Reprendre une photo</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </>
      )}
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
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, backgroundColor: "rgba(0,0,0,0.4)" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20 },
  topTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  bigBtn: { backgroundColor: "#C9A84C", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 6 },
  bigBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
  bigBtnOutline: { borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  bigBtnOutlineText: { color: "#C9A84C", fontWeight: "600", fontSize: 16 },
  detectOverlay: { alignItems: "center", gap: 16, backgroundColor: "rgba(0,0,0,0.5)", padding: 32, borderRadius: 24 },
  detectText: { color: "#C9A84C", fontSize: 16, fontWeight: "600" },
  noFaceBanner: { marginHorizontal: 20, marginTop: 16, backgroundColor: "rgba(249,115,22,0.15)", borderWidth: 1, borderColor: "rgba(249,115,22,0.3)", borderRadius: 12, padding: 12 },
  noFaceText: { color: "#f97316", fontSize: 13, lineHeight: 18 },
  chipsRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" },
  chipActive: { backgroundColor: "rgba(201,168,76,0.2)", borderColor: "rgba(201,168,76,0.6)" },
  chipOn: { borderColor: "rgba(201,168,76,0.3)" },
  chipLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  chipLabelActive: { color: "#C9A84C" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C9A84C" },
  intensityRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 8, marginTop: 4, marginBottom: 8 },
  intensityLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginRight: 4 },
  intensityBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center" },
  intensityBtnActive: { backgroundColor: "rgba(201,168,76,0.2)", borderColor: "#C9A84C" },
  intensityText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  intensityTextActive: { color: "#C9A84C", fontWeight: "700" },
  paletteRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10, marginBottom: 16, marginTop: 4, flexWrap: "wrap" },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  swatchActive: { borderWidth: 3, borderColor: "#C9A84C", width: 36, height: 36, borderRadius: 18 },
  toggleBtn: { marginLeft: "auto", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  toggleBtnOn: { borderColor: "#C9A84C", backgroundColor: "rgba(201,168,76,0.15)" },
  captureBtn: { backgroundColor: "#C9A84C", borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, elevation: 6 },
  captureBtnText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
  retakeBtn: { borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  retakeText: { color: "#C9A84C", fontSize: 15, fontWeight: "600" },
});
