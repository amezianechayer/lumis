import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { useLanguageStore } from "../../stores/language.store";
import { t } from "../../utils/i18n";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import { WeatherTipCard } from "../../components/ui/WeatherTipCard";
import { useThemeColors } from "../../stores/theme.store";
import { api } from "../../services/api";

const TERRACOTTA = "#C9826B";

function PulseScoreRing({ score, color, size = 84 }: { score: number; color: string; size?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={[{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 3, borderColor: color,
      backgroundColor: `${color}18`,
      alignItems: "center", justifyContent: "center",
    }, ringStyle]}>
      <Text style={{ color, fontWeight: "700", fontSize: size * 0.3 }}>{score}</Text>
      <Text style={{ color: `${color}90`, fontSize: size * 0.13 }}>/100</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  useLanguageStore();
  const c = useThemeColors();
  const { user, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const firstName = user?.full_name?.split(" ")[0] ?? "toi";
  const isMale = user?.gender === "male";

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

  const { data: routineStatus } = useQuery({
    queryKey: ["routine-status"],
    queryFn: () => api.getRoutineStatus(),
    staleTime: 1000 * 60,
  });

  const isLoading = authLoading || skinLoading || faceLoading;

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["skin-scan", "latest"] });
    queryClient.invalidateQueries({ queryKey: ["face-profile", "latest"] });
    queryClient.invalidateQueries({ queryKey: ["routine-status"] });
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
  const scoreColor = skinScore === null ? TERRACOTTA : skinScore >= 75 ? "#5DCAA5" : skinScore >= 50 ? TERRACOTTA : "#F09595";
  const streak = routineStatus?.streak ?? 0;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ScrollView
      className="flex-1 bg-lumis-black"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={TERRACOTTA} />}
    >
      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.delay(40)} style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontSize: 12, textTransform: "capitalize" }}>{today}</Text>
          <Text style={{ color: c.text, fontSize: 26, fontWeight: "300", letterSpacing: 0.2, marginTop: 2 }}>
            Bonjour <Text style={{ fontWeight: "600", color: TERRACOTTA }}>{firstName}</Text>
          </Text>
        </View>
        <StreakBadge streak={streak} onPress={() => router.push("/routine" as any)} />
      </Animated.View>

      {/* ── Hero score ── */}
      <Animated.View entering={FadeInDown.delay(100)} className="mt-5">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.navigate("/(tabs)/scan")}
          style={{ backgroundColor: "rgba(201,130,107,0.1)", borderWidth: 0.5, borderColor: "rgba(201,130,107,0.3)", borderRadius: 24, padding: 22 }}
        >
          {skinScore !== null ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <PulseScoreRing score={skinScore} color={scoreColor} />
                <View style={{ flex: 1, gap: 7 }}>
                  <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 }}>Score de peau</Text>
                  <MiniBar label="Hydratation" score={skinScan?.hydration_score ?? 0} />
                  <MiniBar label="Texture" score={skinScan?.texture_score ?? 0} />
                  <MiniBar label="Uniformité" score={skinScan?.uniformity_score ?? 0} />
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                <Text style={{ color: c.textFaint, fontSize: 11 }}>
                  {skinScan ? `Dernier scan · ${new Date(skinScan.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
                </Text>
                <Text style={{ color: TERRACOTTA, fontSize: 12, fontWeight: "600" }}>Détails →</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📸</Text>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "600", marginBottom: 4 }}>Fais ton premier scan</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center", marginBottom: 12 }}>
                Découvre ton score de peau et tes recommandations
              </Text>
              <View style={{ backgroundColor: TERRACOTTA, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10 }}>
                <Text style={{ color: "#EDE4D4", fontWeight: "700", fontSize: 13 }}>Commencer →</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Conseil du jour (météo) ── */}
      <Animated.View entering={FadeInDown.delay(160)} className="mt-3">
        <WeatherTipCard />
      </Animated.View>

      {/* ── Profil facial (compact) ── */}
      {faceProfile && (
        <Animated.View entering={FadeInDown.delay(220)} className="mt-3">
          <TouchableOpacity
            onPress={() => router.push("/analysis/face")}
            activeOpacity={0.85}
            style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 20, padding: 16 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Profil facial</Text>
              <Text style={{ color: TERRACOTTA, fontSize: 11 }}>Voir →</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ProfileChip label="Visage" value={faceProfile.face_shape} />
              <ProfileChip label="Undertone" value={faceProfile.undertone} />
              <ProfileChip label="Saison" value={faceProfile.color_season} gold />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Mon espace : grille bento ── */}
      <Animated.View entering={FadeInDown.delay(280)} className="mt-6">
        <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Mon espace</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <ToolTile
            icon="🔥" label="Routine" sub={streak > 0 ? `${streak} j de série` : "Matin & soir"} tint="#fbbf24"
            onPress={() => router.push("/routine" as any)}
          />
          <ToolTile
            icon={isMale ? "💪" : "✨"} label={isMale ? "Jawline" : "Glow Up"} sub="Exercices guidés" tint="#5DCAA5"
            onPress={() => router.push("/exercises" as any)}
          />
          {isMale ? (
            <ToolTile icon="💈" label="Coupes & Barbes" sub="Styles pour toi" tint="#60a5fa"
              onPress={() => router.push("/men-styles" as any)} />
          ) : (
            <ToolTile icon="💄" label="Try-On" sub="Maquillage AR" tint="#f472b6"
              onPress={() => router.push("/tryon" as any)} />
          )}
          {!isMale && (
            <ToolTile icon="🌙" label="Cycle & Peau" sub="Phase hormonale" tint="#a78bfa"
              onPress={() => router.push("/cycle" as any)} />
          )}
          <ToolTile icon="🔬" label="Analyse express" sub="Type de peau & teint" tint={TERRACOTTA}
            onPress={() => router.push("/skin-analysis" as any)} />
          <ToolTile icon="🧴" label="Scan produit" sub="Compatibilité" tint={TERRACOTTA}
            onPress={() => router.push("/products/scan" as any)} />
        </View>
      </Animated.View>

      {/* ── Premium CTA ── */}
      {!user?.premium_until && (
        <Animated.View
          entering={FadeInDown.delay(360)}
          className="mt-5"
          style={{ borderWidth: 0.5, borderColor: "rgba(201,130,107,0.3)", borderRadius: 24, padding: 20, backgroundColor: "rgba(201,130,107,0.06)" }}
        >
          <Text style={{ color: TERRACOTTA, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
            {t("home.premium_badge")}
          </Text>
          <Text style={{ color: c.text, fontSize: 19, fontWeight: "300", marginBottom: 2 }}>
            {t("home.premium_title")}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 14 }}>
            {t("home.premium_subtitle")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/premium" as any)}
            style={{ backgroundColor: TERRACOTTA, borderRadius: 12, paddingVertical: 13, alignItems: "center" }}
            activeOpacity={0.85}
          >
            <Text style={{ color: "#EDE4D4", fontWeight: "700", fontSize: 14 }}>{t("home.premium_cta")}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function StreakBadge({ streak, onPress }: { streak: number; onPress: () => void }) {
  const c = useThemeColors();
  const active = streak > 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
        backgroundColor: active ? "rgba(251,191,36,0.12)" : c.bgCard,
        borderWidth: 0.5,
        borderColor: active ? "rgba(251,191,36,0.4)" : c.borderLight,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ fontSize: 16, opacity: active ? 1 : 0.5 }}>🔥</Text>
      <Text style={{ color: active ? "#fbbf24" : c.textMuted, fontWeight: "700", fontSize: 15 }}>{streak}</Text>
    </TouchableOpacity>
  );
}

function MiniBar({ label, score }: { label: string; score: number }) {
  const c = useThemeColors();
  const color = score >= 75 ? "#5DCAA5" : score >= 50 ? TERRACOTTA : "#F09595";
  return (
    <View>
      <View className="flex-row justify-between mb-0.5">
        <Text style={{ color: c.textMuted, fontSize: 10 }}>{label}</Text>
        <Text style={{ color, fontSize: 10, fontWeight: "600" }}>{score}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: c.borderLight, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${score}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function ProfileChip({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  const c = useThemeColors();
  return (
    <View style={{
      flex: 1, borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 0.5,
      backgroundColor: gold ? "rgba(201,130,107,0.1)" : c.bgCard,
      borderColor: gold ? "rgba(201,130,107,0.3)" : c.borderLight,
    }}>
      <Text style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, color: gold ? "rgba(201,130,107,0.7)" : c.textMuted }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: "500", textTransform: "capitalize", color: gold ? TERRACOTTA : c.text }}>
        {value}
      </Text>
    </View>
  );
}

function ToolTile({ icon, label, sub, tint, onPress }: { icon: string; label: string; sub: string; tint: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: "47.5%", flexGrow: 1,
        backgroundColor: c.bgCard,
        borderWidth: 0.5, borderColor: c.borderLight,
        borderRadius: 18, padding: 16,
      }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: `${tint}22`, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>{sub}</Text>
    </TouchableOpacity>
  );
}
