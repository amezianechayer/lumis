import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { api } from "../../services/api";
import { ScannedProduct } from "../../types/api";
import { useThemeColors } from "../../stores/theme.store";
import { useAuthStore } from "../../stores/auth.store";
import { InciAnalysis } from "../../components/products/InciAnalysis";

const TERRACOTTA = "#C9826B";

const VERDICT_CONFIG: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent ✅", color: "#4ade80" },
  good: { label: "Bon 👍", color: "#C9826B" },
  neutral: { label: "Neutre ⚠️", color: "#f97316" },
  avoid: { label: "À éviter ❌", color: "#f87171" },
};

function scoreColor(s: number) {
  return s >= 75 ? "#4ade80" : s >= 50 ? "#C9826B" : "#f87171";
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const skinCtx = { skinType: user?.skin_type, acneProne: user?.skin_type === "oily" };

  const { data: product, isLoading, isError } = useQuery<ScannedProduct>({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const history = await api.getProductHistory();
      const found = history.find((p) => p.id === id);
      if (!found) throw new Error("Produit introuvable");
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

  if (isError || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
        <Text style={{ color: c.text, fontSize: 16, marginBottom: 16 }}>Produit introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: TERRACOTTA, fontWeight: "600" }}>← Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const verdict = VERDICT_CONFIG[product.verdict] ?? VERDICT_CONFIG.neutral;
  const sc = scoreColor(product.compatibility_score);
  const date = new Date(product.created_at).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Détail du produit</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Image */}
        {product.image_url ? (
          <Animated.View entering={FadeIn} style={{ alignItems: "center", marginTop: 8, marginBottom: 16 }}>
            <Image
              source={{ uri: product.image_url }}
              style={{ width: 130, height: 130, borderRadius: 18, backgroundColor: c.bgCard }}
              resizeMode="contain"
            />
          </Animated.View>
        ) : null}

        {/* Name / brand / category */}
        <Animated.View entering={FadeInDown.delay(40)} style={{ marginBottom: 16 }}>
          <Text style={{ color: c.text, fontSize: 22, fontWeight: "700", lineHeight: 28 }}>
            {product.product_name || "Produit inconnu"}
          </Text>
          {product.brand ? (
            <Text style={{ color: c.textMuted, fontSize: 15, marginTop: 2 }}>{product.brand}</Text>
          ) : null}
          {product.category ? (
            <Text style={{ color: c.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>
              {product.category}
            </Text>
          ) : null}
        </Animated.View>

        {/* Score + verdict */}
        <Animated.View entering={ZoomIn.delay(80)} style={{
          flexDirection: "row", alignItems: "center", gap: 16,
          backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 20, padding: 18, marginBottom: 16,
        }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: sc, backgroundColor: `${sc}18`, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: sc, fontWeight: "800", fontSize: 26 }}>{product.compatibility_score}</Text>
            <Text style={{ color: `${sc}99`, fontSize: 10 }}>/100</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Compatibilité avec ta peau
            </Text>
            <View style={{ alignSelf: "flex-start", backgroundColor: `${verdict.color}20`, borderWidth: 0.5, borderColor: `${verdict.color}50`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: verdict.color, fontWeight: "700", fontSize: 14 }}>{verdict.label}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Pros */}
        {product.pros && product.pros.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Avantages</Text>
            <View style={{ gap: 8 }}>
              {product.pros.map((pro, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Text style={{ color: "#4ade80", fontSize: 14 }}>•</Text>
                  <Text style={{ color: c.text, fontSize: 13, flex: 1, lineHeight: 19 }}>{pro}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Cons */}
        {product.cons && product.cons.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Points d'attention</Text>
            <View style={{ gap: 8 }}>
              {product.cons.map((con, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Text style={{ color: "#f97316", fontSize: 14 }}>•</Text>
                  <Text style={{ color: c.text, fontSize: 13, flex: 1, lineHeight: 19 }}>{con}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Tip */}
        {product.tip ? (
          <Animated.View entering={FadeInDown.delay(200)} style={{ backgroundColor: c.primaryMuted, borderWidth: 0.5, borderColor: c.border, borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: TERRACOTTA, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Conseil perso</Text>
            <Text style={{ color: c.text, fontSize: 13, lineHeight: 19, fontStyle: "italic" }}>{product.tip}</Text>
          </Animated.View>
        ) : null}

        {/* INCI analysis */}
        {product.ingredients ? (
          <Animated.View entering={FadeInDown.delay(240)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🔬 Analyse INCI</Text>
            <InciAnalysis ingredients={product.ingredients} skin={skinCtx} />
          </Animated.View>
        ) : null}

        {/* Footer meta */}
        <Animated.View entering={FadeInDown.delay(280)} style={{ marginTop: 8 }}>
          <Text style={{ color: c.textFaint, fontSize: 11, textAlign: "center" }}>Scanné le {date}</Text>
          <Text style={{ color: c.textFaint, fontSize: 11, textAlign: "center", marginTop: 2 }}>Code-barres : {product.barcode}</Text>
        </Animated.View>

        {/* CTA: rescan */}
        <TouchableOpacity onPress={() => router.replace("/products/scan")} activeOpacity={0.85} style={{ marginTop: 20, backgroundColor: TERRACOTTA, borderRadius: 14, paddingVertical: 15, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>📷 Scanner un autre produit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
