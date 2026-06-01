import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../services/api";

export default function MakeupGuideScreen() {
  const router = useRouter();

  const { data: guide, isLoading, isError, error } = useQuery({
    queryKey: ["makeup-guide"],
    queryFn: () => api.getMakeupGuide(),
    staleTime: 1000 * 60 * 60, // 1h client-side (backend caches 24h)
    retry: 1,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ color: "#C9A84C", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18, flex: 1 }}>
          Guide personnalisé IA
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginTop: 16, textAlign: "center" }}>
            L'IA crée ton guide sur-mesure…
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 6, textAlign: "center" }}>
            Selon ta forme de visage, ton teint et ton scan de peau
          </Text>
        </View>
      ) : isError || !guide ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>😕</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 8 }}>
            Guide indisponible
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
            {String((error as Error)?.message ?? "").includes("face profile") || String((error as Error)?.message ?? "").includes("analyse")
              ? "Fais d'abord ton analyse faciale pour générer un guide personnalisé."
              : "Réessaie dans un moment."}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: "#C9A84C", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#0A0A0A", fontWeight: "700" }}>Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Title + intro */}
          <Animated.View entering={FadeInDown.delay(0)} style={{ backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{guide.is_male ? "💈" : "💄"}</Text>
              <Text style={{ color: "rgba(201,168,76,0.7)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                Généré par IA pour toi
              </Text>
            </View>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>{guide.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 20 }}>{guide.intro}</Text>
          </Animated.View>

          {/* Color tips */}
          {guide.color_tips && guide.color_tips.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80)} style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                🎨 Tes couleurs
              </Text>
              <View style={{ gap: 8 }}>
                {guide.color_tips.map((tip, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Text style={{ color: "#C9A84C", fontSize: 13 }}>•</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, flex: 1, lineHeight: 19 }}>{tip}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Steps */}
          <Animated.View entering={FadeInDown.delay(160)} style={{ marginBottom: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>
              📋 Ta routine étape par étape
            </Text>
            {guide.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#C9A84C", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <Text style={{ color: "#0A0A0A", fontWeight: "800", fontSize: 13 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, marginBottom: 4 }}>{step.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 19 }}>{step.description}</Text>
                  {step.tip ? (
                    <View style={{ marginTop: 8, backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: "#C9A84C", fontSize: 12 }}>💡 {step.tip}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>

          {/* Products */}
          {guide.products && guide.products.length > 0 && (
            <Animated.View entering={FadeInDown.delay(240)}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>
                🛍️ Produits recommandés
              </Text>
              {guide.products.map((p, i) => (
                <View key={i} style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, flex: 1 }}>{p.name}</Text>
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 4 }}>{p.category}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18 }}>{p.why}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginTop: 12 }}>
            Guide généré par IA · mis à jour après chaque nouveau scan
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
