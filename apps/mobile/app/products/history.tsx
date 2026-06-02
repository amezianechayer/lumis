import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../services/api";
import { ScannedProduct } from "../../types/api";

const VERDICT_CONFIG: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "#4ade80" },
  good: { label: "Bon", color: "#C9826B" },
  neutral: { label: "Neutre", color: "#f97316" },
  avoid: { label: "Éviter", color: "#f87171" },
};

function scoreColor(s: number) {
  return s >= 75 ? "#4ade80" : s >= 50 ? "#C9826B" : "#f87171";
}

export default function ProductHistoryScreen() {
  const router = useRouter();

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["product-history"],
    queryFn: () => api.getProductHistory(),
    staleTime: 0,
  });

  const found = products.filter((p) => !p.not_found);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0F" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.08)" }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ color: "#C9826B", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18, flex: 1 }}>Produits scannés</Text>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{found.length}</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#C9826B" size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ color: "#f87171", fontSize: 15, marginBottom: 12 }}>Erreur de chargement</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={{ color: "#C9826B", fontWeight: "600" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : found.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🧴</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 6 }}>Aucun produit scanné</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
            Scanne le code-barres de tes produits pour vérifier leur compatibilité avec ta peau.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/products/scan")} style={{ backgroundColor: "#C9826B", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#0D0D0F", fontWeight: "700" }}>📷 Scanner un produit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          {found.map((p: ScannedProduct, i) => {
            const verdict = VERDICT_CONFIG[p.verdict] ?? VERDICT_CONFIG.neutral;
            const sc = scoreColor(p.compatibility_score);
            const date = new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 40)}>
                <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                  {/* Image or score circle */}
                  {p.image_url ? (
                    <Image source={{ uri: p.image_url }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)" }} resizeMode="contain" />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: sc, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: sc, fontWeight: "700", fontSize: 16 }}>{p.compatibility_score}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                      {p.product_name || "Produit"}
                    </Text>
                    {p.brand ? (
                      <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 1 }}>{p.brand}</Text>
                    ) : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <View style={{ backgroundColor: `${verdict.color}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: verdict.color, fontSize: 11, fontWeight: "600" }}>{verdict.label}</Text>
                      </View>
                      <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{date}</Text>
                    </View>
                  </View>
                  <Text style={{ color: sc, fontWeight: "700", fontSize: 15 }}>{p.compatibility_score}<Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>/100</Text></Text>
                </View>
              </Animated.View>
            );
          })}

          <TouchableOpacity onPress={() => router.replace("/products/scan")} style={{ marginTop: 8, borderWidth: 0.5, borderColor: "rgba(201,168,76,0.4)", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ color: "#C9826B", fontWeight: "600", fontSize: 14 }}>📷 Scanner un nouveau produit</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
