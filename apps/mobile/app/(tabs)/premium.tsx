import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useRevenueCat } from "../../hooks/useRevenueCat";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

const FEATURES_FREE = [
  { emoji: "📸", label: "3 scans peau / mois" },
  { emoji: "🤖", label: "Coach IA (10 messages / jour)" },
  { emoji: "💡", label: "Recommandations de base" },
  { emoji: "📊", label: "Historique 30 jours" },
];

const FEATURES_PREMIUM = [
  { emoji: "📸", label: "Scans peau illimités" },
  { emoji: "🤖", label: "Coach IA illimité + contexte complet" },
  { emoji: "✨", label: "Recommandations IA ultra-personnalisées" },
  { emoji: "📊", label: "Historique illimité" },
  { emoji: "🎨", label: "Analyse couleurs avancée" },
  { emoji: "💄", label: "Virtual Try-On illimité" },
];

export default function PremiumScreen() {
  const { isPremium, customerInfo, packages, isLoading, error, purchase, restore, refresh } = useRevenueCat();
  const queryClient = useQueryClient();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const premiumUntil = customerInfo?.entitlements.active["Lumis - Find & Relax Pro"]?.expirationDate;

  // ── Present RevenueCat Paywall ──────────────────────────────────────────────
  const handlePresentPaywall = async () => {
    // Si les packages sont vides (pas encore configurés en store), afficher un message clair
    if (!isLoading && packages.length === 0) {
      Alert.alert(
        "Bientôt disponible",
        "Les offres Premium seront disponibles lors du lancement officiel de l'app.",
        [{ text: "OK" }]
      );
      return;
    }
    try {
      const result = await RevenueCatUI.presentPaywall();
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        await api.activatePremium(12);
        queryClient.invalidateQueries({ queryKey: ["premium-status"] });
        queryClient.invalidateQueries({ queryKey: ["me"] });
        await refresh();
        Alert.alert("🎉 Bienvenue Premium !", "Ton abonnement est maintenant actif.");
      }
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      // Code 23 = CONFIGURATION_ERROR (produits pas encore publiés en store)
      if (err?.code === 23) {
        Alert.alert(
          "Bientôt disponible",
          "Les offres Premium seront disponibles lors du lancement officiel de l'app.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Erreur", err?.message ?? "Impossible d'afficher le paywall.");
      }
    }
  };

  // ── Fallback manual purchase (if paywall unavailable) ──────────────────────
  const handleManualPurchase = async (pkgIndex: number) => {
    if (!packages[pkgIndex]) return;
    setPurchasing(true);
    try {
      const success = await purchase(packages[pkgIndex]);
      if (success) {
        Alert.alert("🎉 Bienvenue Premium !", "Ton abonnement est maintenant actif.");
      }
    } catch {}
    finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const restored = await restore();
    setPurchasing(false);
    if (restored) {
      Alert.alert("✅ Restauré !", "Ton accès Premium est actif.");
    } else {
      Alert.alert("Aucun achat trouvé", "Aucun abonnement actif sur ce compte.");
    }
  };

  // ── Present Customer Center ─────────────────────────────────────────────────
  const handleCustomerCenter = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch {
      Alert.alert("Non disponible", "Le centre client n'est pas disponible pour le moment.");
    }
  };

  // ── Already premium ─────────────────────────────────────────────────────────
  if (isPremium) {
    return (
      <ScrollView
        className="flex-1 bg-lumis-black"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
      >
        <Animated.View entering={FadeInDown.delay(0)} className="items-center mb-10">
          <Text style={{ fontSize: 52, marginBottom: 16 }}>✨</Text>
          <Text className="text-lumis-gold font-display text-3xl text-center">Tu es Premium</Text>
          {premiumUntil && (
            <Text className="text-lumis-white/40 font-body text-sm mt-2 text-center">
              Valide jusqu'au{" "}
              {new Date(premiumUntil).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} className="gap-3 mb-8">
          {FEATURES_PREMIUM.map((f, i) => (
            <View
              key={i}
              className="flex-row items-center gap-3 bg-lumis-gold/10 border border-lumis-gold/25 rounded-2xl px-4 py-3"
            >
              <Text style={{ fontSize: 18 }}>{f.emoji}</Text>
              <Text className="text-lumis-white font-body text-sm flex-1">{f.label}</Text>
              <Text className="text-lumis-gold text-sm">✓</Text>
            </View>
          ))}
        </Animated.View>

        {/* Customer Center */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <TouchableOpacity
            onPress={handleCustomerCenter}
            className="border border-white/10 rounded-2xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-lumis-white/50 font-body text-sm">
              Gérer mon abonnement
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  // ── Not premium ─────────────────────────────────────────────────────────────
  return (
    <ScrollView
      className="flex-1 bg-lumis-black"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View entering={FadeInDown.delay(0)} className="items-center mb-8">
        <Text style={{ fontSize: 52, marginBottom: 16 }}>👑</Text>
        <Text className="text-lumis-white font-display text-3xl text-center mb-2">
          Passe à <Text className="text-lumis-gold">Premium</Text>
        </Text>
        <Text className="text-lumis-white/40 font-body text-sm text-center leading-6 px-4">
          Débloques tout le potentiel de Lumis pour une routine beauté vraiment personnalisée.
        </Text>
      </Animated.View>

      {/* Comparaison */}
      <Animated.View entering={FadeInDown.delay(80)} className="mb-8">
        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-3">
          <Text className="text-lumis-white/60 font-body-medium text-xs uppercase tracking-widest mb-4">
            Gratuit
          </Text>
          <View className="gap-2">
            {FEATURES_FREE.map((f, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <Text style={{ fontSize: 16 }}>{f.emoji}</Text>
                <Text className="text-lumis-white/50 font-body text-sm">{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-lumis-gold/10 border border-lumis-gold/40 rounded-2xl p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lumis-gold font-body-medium text-xs uppercase tracking-widest">
              Premium
            </Text>
            <View className="bg-lumis-gold/20 rounded-full px-2 py-0.5">
              <Text className="text-lumis-gold font-body text-[10px]">Recommandé</Text>
            </View>
          </View>
          <View className="gap-2">
            {FEATURES_PREMIUM.map((f, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <Text style={{ fontSize: 16 }}>{f.emoji}</Text>
                <Text className="text-lumis-white font-body text-sm">{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Packages */}
      {!isLoading && packages.length > 0 && (
        <Animated.View entering={FadeInDown.delay(140)} className="gap-3 mb-6">
          {packages.map((pkg, i) => {
            const isYearly = pkg.product.identifier.includes("yearly");
            const isSix = pkg.product.identifier.includes("six");
            const badge = isYearly ? "🏆 Meilleure valeur" : isSix ? "💎 Populaire" : null;
            return (
              <TouchableOpacity
                key={pkg.identifier}
                onPress={() => handleManualPurchase(i)}
                disabled={purchasing}
                className={`rounded-2xl p-4 border ${
                  isYearly
                    ? "bg-lumis-gold/15 border-lumis-gold/50"
                    : "bg-white/5 border-white/10"
                }`}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-lumis-white font-body-bold text-base">
                        {pkg.product.title || pkg.packageType}
                      </Text>
                      {badge && (
                        <View className="bg-lumis-gold/25 rounded-full px-2 py-0.5">
                          <Text className="text-lumis-gold font-body text-[10px]">{badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-lumis-white/40 font-body text-xs">
                      {pkg.product.description}
                    </Text>
                  </View>
                  <Text className="text-lumis-gold font-display text-xl">
                    {pkg.product.priceString}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Error */}
      {error && (
        <View className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <Text className="text-red-400 font-body text-sm text-center">{error}</Text>
        </View>
      )}

      {/* Main CTA — RevenueCat Paywall */}
      <Animated.View entering={FadeInDown.delay(200)} className="gap-3">
        <TouchableOpacity
          onPress={handlePresentPaywall}
          disabled={isLoading || purchasing}
          className="bg-lumis-gold rounded-2xl py-4 items-center"
          activeOpacity={0.85}
          style={{
            opacity: isLoading ? 0.6 : 1,
            shadowColor: "#C9826B",
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          {isLoading || purchasing ? (
            <ActivityIndicator color="#0D0D0F" />
          ) : (
            <Text className="text-lumis-black font-body-medium text-base">
              Voir les offres Premium
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          disabled={isLoading || purchasing}
          className="items-center py-3"
          activeOpacity={0.7}
        >
          <Text className="text-lumis-white/30 font-body text-xs">
            Restaurer mes achats
          </Text>
        </TouchableOpacity>

        <Text className="text-lumis-white/15 font-body text-xs text-center">
          Paiement sécurisé via Google Play · Annulable à tout moment
        </Text>
      </Animated.View>
    </ScrollView>
  );
}
