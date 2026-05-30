import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { useLanguageStore } from "../../stores/language.store";
import { t } from "../../utils/i18n";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import { api } from "../../services/api";

export default function HomeScreen() {
  useLanguageStore();
  const { user, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const firstName = user?.full_name?.split(" ")[0] ?? "toi";

  const { data: skinScan, isLoading: skinLoading } = useQuery({
    queryKey: ["skin-scan", "latest"],
    queryFn: () => api.getLatestSkinScan(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: faceProfile, isLoading: faceLoading } = useQuery({
    queryKey: ["face-profile", "latest"],
    queryFn: () => api.getLatestFaceProfile(),
    staleTime: 1000 * 60 * 10,
  });

  const isLoading = authLoading || skinLoading || faceLoading;

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["skin-scan", "latest"] });
    queryClient.invalidateQueries({ queryKey: ["face-profile", "latest"] });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-lumis-black px-6 pt-16 gap-5">
        <Skeleton width="50%" height={20} />
        <Skeleton width="70%" height={32} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={1} />
      </View>
    );
  }

  const skinScore = skinScan?.overall_score ?? null;
  const scoreColor = skinScore === null ? "#C9A84C" : skinScore >= 75 ? "#4ade80" : skinScore >= 50 ? "#C9A96E" : "#f87171";

  return (
    <ScrollView
      className="flex-1 bg-lumis-black"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#C9A84C" />}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)}>
        <Text className="text-lumis-white/60 font-body text-base">
          {t("home.greeting", { name: firstName })}
        </Text>
        <Text className="text-lumis-white font-display text-3xl mt-1">
          {t("home.dashboard_title")}
        </Text>
      </Animated.View>

      {/* Skin Score */}
      <Animated.View
        entering={FadeInDown.delay(150)}
        className="mt-8 bg-lumis-gold/10 border border-lumis-gold/30 rounded-3xl p-6"
      >
        <Text className="text-lumis-white/60 font-body text-xs uppercase tracking-widest mb-3">
          {t("home.skin_score_label")}
        </Text>

        {skinScore !== null ? (
          <>
            <View className="flex-row items-center gap-4">
              {/* Score ring */}
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  borderWidth: 3,
                  borderColor: scoreColor,
                  backgroundColor: `${scoreColor}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: scoreColor, fontWeight: "700", fontSize: 22 }}>
                  {skinScore}
                </Text>
                <Text style={{ color: `${scoreColor}90`, fontSize: 10 }}>/100</Text>
              </View>

              {/* Sub-scores */}
              <View className="flex-1 gap-1.5">
                <MiniBar label="Hydratation" score={skinScan?.hydration_score ?? 0} />
                <MiniBar label="Texture" score={skinScan?.texture_score ?? 0} />
                <MiniBar label="Uniformité" score={skinScan?.uniformity_score ?? 0} />
              </View>
            </View>

            {skinScan && (
              <Text className="text-lumis-white/40 font-body text-xs mt-3">
                Dernière analyse ·{" "}
                {new Date(skinScan.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            )}

            <TouchableOpacity
              onPress={() => router.navigate("/(tabs)/scan")}
              className="mt-4 bg-lumis-gold/20 border border-lumis-gold/40 rounded-xl py-3 items-center"
            >
              <Text className="text-lumis-gold font-body-medium text-sm">
                Nouveau scan
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="text-lumis-gold font-display text-5xl">—</Text>
            <Text className="text-lumis-white/50 font-body text-sm mt-2">
              {t("home.skin_score_empty")}
            </Text>
            <TouchableOpacity
              onPress={() => router.navigate("/(tabs)/scan")}
              className="mt-4 bg-lumis-gold/20 border border-lumis-gold/40 rounded-xl py-3 items-center"
            >
              <Text className="text-lumis-gold font-body-medium text-sm">
                {t("home.start_scan")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Face profile card */}
      {faceProfile && (
        <Animated.View
          entering={FadeInDown.delay(220)}
          className="mt-4 bg-white/5 border border-white/10 rounded-3xl p-5"
        >
          <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-3">
            Profil facial
          </Text>
          <View className="flex-row gap-3">
            <ProfileChip label="Visage" value={faceProfile.face_shape} />
            <ProfileChip label="Undertone" value={faceProfile.undertone} />
            <ProfileChip label="Saison" value={faceProfile.color_season} gold />
          </View>
          <TouchableOpacity
            onPress={() => router.push("/analysis/face")}
            className="mt-3 flex-row items-center gap-1"
            activeOpacity={0.7}
          >
            <Text className="text-lumis-white/40 font-body text-xs">
              Voir mon profil complet →
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Quick actions */}
      <Animated.View entering={FadeInDown.delay(faceProfile ? 300 : 250)} className="mt-6">
        <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-4">
          {t("home.quick_access")}
        </Text>
        <View className="flex-row gap-3">
          <QuickCard icon="🧴" label={t("home.recommendations")} onPress={() => router.navigate("/(tabs)/recs")} />
          <QuickCard icon="✨" label={t("home.ai_coach")} onPress={() => router.navigate("/(tabs)/coach")} />
          <QuickCard icon="📊" label={t("home.history")} onPress={() => router.navigate("/(tabs)/scan")} />
        </View>
      </Animated.View>

      {/* Outils */}
      <Animated.View entering={FadeInDown.delay(faceProfile ? 360 : 310)} className="mt-6 gap-3">
        <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest">
          Outils
        </Text>

        {/* Try-On AR */}
        <TouchableOpacity
          onPress={() => router.push("/tryon" as any)}
          className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden"
          activeOpacity={0.8}
        >
          <View className="w-11 h-11 rounded-xl bg-pink-500/20 items-center justify-center mr-4">
            <Text className="text-2xl">💄</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text className="text-lumis-white font-body-medium text-sm">Virtual Try-On</Text>
              <View className="bg-pink-500/20 rounded-full px-2 py-0.5">
                <Text style={{ color: "#f472b6", fontSize: 9, fontWeight: "700" }}>NOUVEAU</Text>
              </View>
            </View>
            <Text className="text-lumis-white/40 font-body text-xs">
              Essaie rouge à lèvres, blush et ombre en AR
            </Text>
          </View>
          <Text className="text-lumis-white/30 text-lg">→</Text>
        </TouchableOpacity>

        {/* Analyse peau Gemini */}
        <TouchableOpacity
          onPress={() => router.push("/skin-analysis" as any)}
          className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl p-4"
          activeOpacity={0.8}
        >
          <View className="w-11 h-11 rounded-xl bg-lumis-gold/15 items-center justify-center mr-4">
            <Text className="text-2xl">🔬</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text className="text-lumis-white font-body-medium text-sm">Analyse IA avancée</Text>
              <View className="bg-lumis-gold/20 rounded-full px-2 py-0.5">
                <Text style={{ color: "#C9A84C", fontSize: 9, fontWeight: "700" }}>GEMINI</Text>
              </View>
            </View>
            <Text className="text-lumis-white/40 font-body text-xs">
              Diagnose complète de ta peau avec Gemini 2.0
            </Text>
          </View>
          <Text className="text-lumis-white/30 text-lg">→</Text>
        </TouchableOpacity>

        {/* Scanner produit */}
        <TouchableOpacity
          onPress={() => router.push("/products/scan" as any)}
          className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl p-4"
          activeOpacity={0.8}
        >
          <View className="w-11 h-11 rounded-xl bg-lumis-gold/15 items-center justify-center mr-4">
            <Text className="text-2xl">🧴</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lumis-white font-body-medium text-sm mb-0.5">Scanner un produit</Text>
            <Text className="text-lumis-white/40 font-body text-xs">
              Vérifie la compatibilité avec ta peau
            </Text>
          </View>
          <Text className="text-lumis-white/30 text-lg">→</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Premium CTA */}
      {!user?.premium_until && (
        <Animated.View
          entering={FadeInDown.delay(420)}
          className="mt-6 border border-lumis-gold/30 rounded-3xl p-5 bg-lumis-gold/5"
        >
          <Text className="text-lumis-gold font-body-bold text-xs uppercase tracking-widest mb-1">
            {t("home.premium_badge")}
          </Text>
          <Text className="text-lumis-white font-display text-xl mb-1">
            {t("home.premium_title")}
          </Text>
          <Text className="text-lumis-white/50 font-body text-sm mb-4">
            {t("home.premium_subtitle")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/premium" as any)}
            className="bg-lumis-gold rounded-xl py-3 items-center"
            activeOpacity={0.85}
          >
            <Text className="text-lumis-black font-body-bold text-sm">
              {t("home.premium_cta")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function MiniBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#C9A96E" : "#f87171";
  return (
    <View>
      <View className="flex-row justify-between mb-0.5">
        <Text className="text-lumis-white/50 font-body text-[10px]">{label}</Text>
        <Text style={{ color, fontSize: 10, fontWeight: "600" }}>{score}</Text>
      </View>
      <View className="h-1 bg-white/8 rounded-full overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function ProfileChip({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <View
      className={`flex-1 rounded-xl p-2.5 items-center border ${
        gold ? "bg-lumis-gold/10 border-lumis-gold/30" : "bg-white/5 border-white/10"
      }`}
    >
      <Text className={`font-body text-[9px] uppercase tracking-widest mb-0.5 ${gold ? "text-lumis-gold/60" : "text-lumis-white/40"}`}>
        {label}
      </Text>
      <Text className={`font-body-medium text-xs capitalize ${gold ? "text-lumis-gold" : "text-lumis-white/80"}`}>
        {value}
      </Text>
    </View>
  );
}

function QuickCard({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center gap-2"
      activeOpacity={0.8}
    >
      <Text className="text-2xl">{icon}</Text>
      <Text className="text-lumis-white/60 font-body text-[10px] text-center">{label}</Text>
    </TouchableOpacity>
  );
}
