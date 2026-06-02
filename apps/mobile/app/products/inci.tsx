import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useThemeColors } from "../../stores/theme.store";
import { useAuthStore } from "../../stores/auth.store";
import { InciAnalysis } from "../../components/products/InciAnalysis";
import { AiInciResult } from "../../components/products/AiInciResult";
import { analyzeInciWithGemini, AiInciResult as AiResult } from "../../services/gemini";

const TERRACOTTA = "#C9826B";

export default function InciScannerScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [localText, setLocalText] = useState("");   // fallback when AI fails
  const [error, setError] = useState<string | null>(null);

  const age = user?.date_of_birth ? Math.max(0, new Date().getFullYear() - new Date(user.date_of_birth).getFullYear()) : undefined;
  const skin = { skinType: user?.skin_type, acneProne: user?.skin_type === "oily", age };

  const reset = () => { setAi(null); setLocalText(""); setError(null); };

  async function runPhoto(source: "camera" | "gallery") {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission", "Autorise la caméra pour photographier les ingrédients."); return; }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.85 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission", "Autorise la galerie."); return; }
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
      }
      if (res.canceled || !res.assets?.[0]) return;

      reset();
      setLoading(true);
      setPhotoUri(res.assets[0].uri);
      const manip = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 1100 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const result = await analyzeInciWithGemini({ imageBase64: manip.base64 ?? undefined, skin });
      setAi(result);
    } catch (e: any) {
      setError(e?.message ?? "Analyse impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function runText() {
    if (text.trim().length < 3) return;
    reset();
    setPhotoUri(null);
    setLoading(true);
    try {
      const result = await analyzeInciWithGemini({ text, skin });
      setAi(result);
    } catch (e: any) {
      // Fallback to instant local analysis if AI unavailable
      setLocalText(text);
      setError("IA indisponible — analyse locale affichée.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Analyse INCI (IA)</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown}>
            <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
              Photographie la liste d'ingrédients au dos du produit (ou colle-la). L'IA lit les ingrédients et les analyse selon ta peau.
            </Text>

            {/* Photo buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => runPhoto("camera")}
                disabled={loading}
                activeOpacity={0.85}
                style={{ flex: 1, backgroundColor: TERRACOTTA, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>📷</Text>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Photographier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => runPhoto("gallery")}
                disabled={loading}
                activeOpacity={0.85}
                style={{ borderWidth: 0.5, borderColor: c.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", flexDirection: "row", gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>🖼️</Text>
                <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14 }}>Galerie</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: c.textFaint, fontSize: 11, textAlign: "center", marginVertical: 6 }}>— ou colle la liste —</Text>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Aqua, Glycerin, Niacinamide, Parfum, Coconut Oil…"
              placeholderTextColor={c.textFaint}
              multiline
              textAlignVertical="top"
              editable={!loading}
              style={{ minHeight: 100, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 14, padding: 14, color: c.text, fontSize: 13, lineHeight: 19 }}
            />
            <TouchableOpacity
              onPress={runText}
              disabled={loading || text.trim().length < 3}
              activeOpacity={0.85}
              style={{ marginTop: 10, backgroundColor: text.trim().length < 3 || loading ? c.primaryMuted : TERRACOTTA, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
            >
              <Text style={{ color: text.trim().length < 3 || loading ? c.textMuted : "#fff", fontWeight: "700", fontSize: 14 }}>Analyser avec l'IA</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Photo preview */}
          {photoUri && (ai || loading) ? (
            <Image source={{ uri: photoUri }} style={{ width: "100%", height: 160, borderRadius: 14, marginTop: 16, backgroundColor: c.bgCard }} resizeMode="contain" />
          ) : null}

          {/* Loading */}
          {loading && (
            <View style={{ alignItems: "center", paddingVertical: 28 }}>
              <ActivityIndicator color={TERRACOTTA} size="large" />
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 12 }}>L'IA analyse les ingrédients…</Text>
            </View>
          )}

          {/* AI result */}
          {ai && !loading && (
            <Animated.View entering={FadeInDown.delay(60)} style={{ marginTop: 18, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 16 }}>
              <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🤖 Analyse IA</Text>
              <AiInciResult data={ai} />
            </Animated.View>
          )}

          {/* Local fallback */}
          {!ai && localText && !loading && (
            <Animated.View entering={FadeInDown.delay(60)} style={{ marginTop: 18, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 16 }}>
              {error ? <Text style={{ color: "#f59e0b", fontSize: 12, marginBottom: 10 }}>{error}</Text> : null}
              <InciAnalysis ingredients={localText} skin={skin} defaultExpanded />
            </Animated.View>
          )}

          {/* Error (photo) */}
          {error && !localText && !loading ? (
            <Text style={{ color: "#F09595", fontSize: 13, textAlign: "center", marginTop: 16 }}>{error}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
