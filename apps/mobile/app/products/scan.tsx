import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../../services/api";
import { ScannedProduct } from "../../types/api";

type ScreenState = "scanner" | "loading" | "result";

export default function ProductScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScreenState>("scanner");
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const handleBarcodeScan = async ({ data: barcode }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setError(null);
    setState("loading");

    try {
      const result = await api.scanProduct(barcode);
      setProduct(result);
      setState("result");
    } catch (e) {
      setError("Une erreur est survenue. Réessaie.");
      setState("scanner");
      scannedRef.current = false;
    }
  };

  const handleScanAnother = () => {
    setProduct(null);
    setError(null);
    scannedRef.current = false;
    setState("scanner");
  };

  // Permission not yet determined
  if (!permission) {
    return <View className="flex-1 bg-lumis-black" />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-lumis-black items-center justify-center px-8">
        <Text className="text-lumis-white font-display text-2xl text-center mb-4">
          Accès à la caméra requis
        </Text>
        <Text className="text-lumis-white/50 font-body text-base text-center mb-8">
          Lumis a besoin d'accéder à ta caméra pour scanner les codes-barres.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-lumis-gold rounded-xl px-8 py-4"
        >
          <Text className="text-lumis-black font-body-bold text-base">
            Autoriser la caméra
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-lumis-white/40 font-body text-sm">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (state === "loading") {
    return (
      <View className="flex-1 bg-lumis-black items-center justify-center px-8">
        <ActivityIndicator size="large" color="#C9826B" />
        <Text className="text-lumis-white font-display text-2xl text-center mt-6">
          Analyse IA du produit…
        </Text>
        <Text className="text-lumis-white/50 font-body text-sm text-center mt-2">
          Vérification de la compatibilité avec ton profil
        </Text>
      </View>
    );
  }

  // Result state
  if (state === "result" && product) {
    if (product.not_found) {
      return (
        <View className="flex-1 bg-lumis-black">
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={handleScanAnother} className="mb-8">
              <Text className="text-lumis-gold font-body text-base">← Retour</Text>
            </TouchableOpacity>
            <View className="items-center py-12">
              <Text className="text-5xl mb-6">🔍</Text>
              <Text className="text-lumis-white font-display text-2xl text-center mb-4">
                Produit non référencé
              </Text>
              <Text className="text-lumis-white/50 font-body text-base text-center leading-relaxed">
                Ce produit n'est pas encore dans notre base de données cosmétiques. Tu peux vérifier les ingrédients manuellement ou contacter notre équipe.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleScanAnother}
              className="bg-lumis-gold/20 border border-lumis-gold/40 rounded-2xl py-4 items-center mt-4"
            >
              <Text className="text-lumis-gold font-body-bold text-base">
                Scanner un autre produit
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    const scoreColor =
      product.compatibility_score >= 75
        ? "#4ade80"
        : product.compatibility_score >= 50
        ? "#C9826B"
        : "#f87171";

    const verdictConfig = {
      excellent: { label: "Excellent ✅", bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
      good: { label: "Bon 👍", bg: "bg-lumis-gold/20", text: "text-lumis-gold", border: "border-lumis-gold/30" },
      neutral: { label: "Neutre ⚠️", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
      avoid: { label: "Éviter ❌", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    };
    const verdict = verdictConfig[product.verdict] ?? verdictConfig.neutral;

    const truncatedIngredients =
      product.ingredients && product.ingredients.length > 200
        ? product.ingredients.slice(0, 200) + "..."
        : product.ingredients;

    return (
      <View className="flex-1 bg-lumis-black">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity onPress={handleScanAnother} className="mb-6">
            <Text className="text-lumis-gold font-body text-base">← Scanner</Text>
          </TouchableOpacity>

          {/* Product image */}
          {product.image_url ? (
            <View className="items-center mb-6">
              <Image
                source={{ uri: product.image_url }}
                style={{ width: 120, height: 120, borderRadius: 16 }}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {/* Product name & brand */}
          <Text className="text-lumis-white font-display text-2xl leading-tight">
            {product.product_name || "Produit inconnu"}
          </Text>
          {product.brand ? (
            <Text className="text-lumis-white/50 font-body text-base mt-1">
              {product.brand}
            </Text>
          ) : null}
          {product.category ? (
            <Text className="text-lumis-white/30 font-body text-xs uppercase tracking-widest mt-1">
              {product.category}
            </Text>
          ) : null}

          {/* Score + Verdict */}
          <View className="flex-row items-center gap-4 mt-6 bg-card border border-line rounded-2xl p-5">
            {/* Score circle */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 3,
                borderColor: scoreColor,
                backgroundColor: `${scoreColor}18`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: scoreColor, fontWeight: "700", fontSize: 24 }}>
                {product.compatibility_score}
              </Text>
              <Text style={{ color: `${scoreColor}90`, fontSize: 10 }}>/100</Text>
            </View>

            {/* Verdict */}
            <View className="flex-1">
              <Text className="text-lumis-white/50 font-body text-xs uppercase tracking-widest mb-2">
                Compatibilité
              </Text>
              <View className={`self-start px-3 py-1.5 rounded-full border ${verdict.bg} ${verdict.border}`}>
                <Text className={`font-body-bold text-sm ${verdict.text}`}>
                  {verdict.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Pros */}
          {product.pros && product.pros.length > 0 && (
            <View className="mt-5">
              <Text className="text-lumis-white/60 font-body text-xs uppercase tracking-widest mb-3">
                Avantages
              </Text>
              <View className="gap-2">
                {product.pros.map((pro, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text className="text-green-400 text-base leading-snug">•</Text>
                    <Text className="text-lumis-white/80 font-body text-sm flex-1 leading-snug">
                      {pro}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Cons */}
          {product.cons && product.cons.length > 0 && (
            <View className="mt-5">
              <Text className="text-lumis-white/60 font-body text-xs uppercase tracking-widest mb-3">
                Points d'attention
              </Text>
              <View className="gap-2">
                {product.cons.map((con, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text className="text-orange-400 text-base leading-snug">•</Text>
                    <Text className="text-lumis-white/80 font-body text-sm flex-1 leading-snug">
                      {con}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tip */}
          {product.tip ? (
            <View className="mt-5 bg-lumis-gold/10 border border-lumis-gold/30 rounded-2xl p-4">
              <Text className="text-lumis-gold font-body text-xs uppercase tracking-widest mb-2">
                Conseil perso
              </Text>
              <Text className="text-lumis-white/80 font-body text-sm leading-relaxed italic">
                {product.tip}
              </Text>
            </View>
          ) : null}

          {/* Ingredients */}
          {truncatedIngredients ? (
            <View className="mt-5">
              <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-2">
                Ingrédients
              </Text>
              <Text className="text-lumis-white/30 font-body text-xs leading-relaxed">
                {truncatedIngredients}
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <Text className="text-red-400 font-body text-sm text-center mt-4">{error}</Text>
          ) : null}

          {/* CTA */}
          <TouchableOpacity
            onPress={handleScanAnother}
            className="mt-8 bg-lumis-gold/20 border border-lumis-gold/40 rounded-2xl py-4 items-center"
          >
            <Text className="text-lumis-gold font-body-bold text-base">
              Scanner un autre produit
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Scanner state
  return (
    <View className="flex-1 bg-lumis-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
        }}
        onBarcodeScanned={handleBarcodeScan}
      >
        {/* Dark overlay with scan area */}
        <View style={{ flex: 1 }}>
          {/* Top overlay */}
          <View
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
            className="items-center justify-end pb-4"
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ position: "absolute", top: 56, left: 24 }}
            >
              <Text className="text-lumis-white font-body-bold text-2xl">←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/products/history")}
              style={{ position: "absolute", top: 56, right: 24, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text className="text-lumis-white font-body text-xs">🕐 Historique</Text>
            </TouchableOpacity>
            <Text className="text-lumis-white font-display text-xl">Scanner un produit</Text>
          </View>

          {/* Scan window */}
          <View style={{ flexDirection: "row", height: 220 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
            {/* Center transparent window */}
            <View style={{ width: 280 }}>
              {/* Corner decorations */}
              <View style={{ position: "absolute", top: 0, left: 0, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#C9826B", borderTopLeftRadius: 4 }} />
              <View style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#C9826B", borderTopRightRadius: 4 }} />
              <View style={{ position: "absolute", bottom: 0, left: 0, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#C9826B", borderBottomLeftRadius: 4 }} />
              <View style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#C9826B", borderBottomRightRadius: 4 }} />
            </View>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
          </View>

          {/* Bottom overlay */}
          <View
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
            className="items-center pt-6 px-8"
          >
            <Text className="text-lumis-white/70 font-body text-sm text-center">
              Pointe vers le code-barres du produit
            </Text>
            {error ? (
              <Text className="text-red-400 font-body text-sm text-center mt-3">{error}</Text>
            ) : null}
          </View>
        </View>
      </CameraView>
    </View>
  );
}
