import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "../../stores/theme.store";
import { useAuthStore } from "../../stores/auth.store";
import { InciAnalysis } from "../../components/products/InciAnalysis";

const TERRACOTTA = "#C9826B";

export default function InciScannerScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const [text, setText] = useState("");
  const [analyzed, setAnalyzed] = useState("");

  const skinCtx = { skinType: user?.skin_type, acneProne: user?.skin_type === "oily" };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Analyse INCI</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown}>
            <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
              Colle la liste d'ingrédients (INCI) d'un produit — au dos de l'emballage. L'analyse signale la fonction de chaque ingrédient et les alertes pour ta peau.
            </Text>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Aqua, Glycerin, Niacinamide, Parfum, Alcohol Denat, Coconut Oil…"
              placeholderTextColor={c.textFaint}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 120, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border,
                borderRadius: 14, padding: 14, color: c.text, fontSize: 13, lineHeight: 19,
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setAnalyzed(text)}
                disabled={text.trim().length < 3}
                activeOpacity={0.85}
                style={{ flex: 1, backgroundColor: text.trim().length < 3 ? c.primaryMuted : TERRACOTTA, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ color: text.trim().length < 3 ? c.textMuted : "#fff", fontWeight: "700", fontSize: 14 }}>Analyser</Text>
              </TouchableOpacity>
              {analyzed ? (
                <TouchableOpacity onPress={() => { setText(""); setAnalyzed(""); }} style={{ borderWidth: 0.5, borderColor: c.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center" }}>
                  <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 14 }}>Effacer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>

          {analyzed ? (
            <Animated.View entering={FadeInDown.delay(80)} style={{ marginTop: 20, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 16 }}>
              <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🔬 Résultat</Text>
              <InciAnalysis ingredients={analyzed} skin={skinCtx} defaultExpanded />
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
