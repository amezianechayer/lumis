import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { useLanguageStore } from "../../stores/language.store";
import { LanguagePicker } from "../../components/ui/LanguagePicker";
import { t } from "../../utils/i18n";
import { api } from "../../services/api";
import { Skeleton } from "../../components/ui/Skeleton";

export default function ProfileScreen() {
  useLanguageStore();
  const { user, logout } = useAuthStore();

  const { data: skinHistory = [], isLoading: skinLoading } = useQuery({
    queryKey: ["skin-history"],
    queryFn: () => api.getSkinHistory(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: latestSkin } = useQuery({
    queryKey: ["skin-scan", "latest"],
    queryFn: () => api.getLatestSkinScan(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: faceProfile } = useQuery({
    queryKey: ["face-profile", "latest"],
    queryFn: () => api.getLatestFaceProfile(),
    staleTime: 1000 * 60 * 10,
  });

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Tu veux vraiment te déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  const totalScans = skinHistory.length;
  const latestScore = latestSkin?.overall_score ?? null;
  const scoreColor = latestScore === null
    ? "#C9A84C"
    : latestScore >= 75 ? "#4ade80" : latestScore >= 50 ? "#C9A96E" : "#f87171";

  // Streak : compter les semaines consécutives avec au moins un scan
  const streak = computeStreak(skinHistory.map((s) => s.created_at));

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  return (
    <ScrollView
      className="flex-1 bg-lumis-black"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0)} className="flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-lumis-white font-display text-3xl">{t("profile.title")}</Text>
          {memberSince && (
            <Text className="text-lumis-white/30 font-body text-xs mt-1">Membre depuis {memberSince}</Text>
          )}
        </View>
        {user?.premium_until && (
          <View className="bg-lumis-gold/20 border border-lumis-gold/40 rounded-full px-3 py-1">
            <Text className="text-lumis-gold font-body-medium text-xs">✨ Premium</Text>
          </View>
        )}
      </Animated.View>

      {/* Stats grid */}
      <Animated.View entering={FadeInDown.delay(80)} className="flex-row gap-3 mb-6">
        {/* Score peau */}
        <View className="flex-1 bg-lumis-gold/10 border border-lumis-gold/30 rounded-2xl p-4 items-center">
          <Text className="text-lumis-white/40 font-body text-[9px] uppercase tracking-widest mb-1">Score peau</Text>
          {skinLoading ? (
            <Skeleton width={40} height={28} />
          ) : (
            <Text style={{ color: scoreColor }} className="font-display text-3xl font-bold">
              {latestScore ?? "—"}
            </Text>
          )}
          <Text className="text-lumis-white/30 font-body text-[10px] mt-0.5">/100</Text>
        </View>

        {/* Total scans */}
        <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
          <Text className="text-lumis-white/40 font-body text-[9px] uppercase tracking-widest mb-1">Scans</Text>
          {skinLoading ? (
            <Skeleton width={32} height={28} />
          ) : (
            <Text className="text-lumis-white font-display text-3xl">{totalScans}</Text>
          )}
          <Text className="text-lumis-white/30 font-body text-[10px] mt-0.5">total</Text>
        </View>

        {/* Streak */}
        <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
          <Text className="text-lumis-white/40 font-body text-[9px] uppercase tracking-widest mb-1">Streak</Text>
          {skinLoading ? (
            <Skeleton width={32} height={28} />
          ) : (
            <Text className="text-lumis-white font-display text-3xl">{streak}</Text>
          )}
          <Text className="text-lumis-white/30 font-body text-[10px] mt-0.5">sem.</Text>
        </View>
      </Animated.View>

      {/* Face profile mini card */}
      {faceProfile && (
        <Animated.View
          entering={FadeInDown.delay(140)}
          className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-4 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-lumis-white/40 font-body text-[10px] uppercase tracking-widest mb-1">Profil facial</Text>
            <Text className="text-lumis-white font-body-medium text-sm capitalize">
              {faceProfile.face_shape} · {faceProfile.color_season}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/analysis/face")}
            className="bg-lumis-gold/15 border border-lumis-gold/30 rounded-xl px-3 py-1.5"
          >
            <Text className="text-lumis-gold font-body text-xs">Voir →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Infos */}
      <Animated.View entering={FadeInDown.delay(180)} className="gap-3 mb-6">
        <InfoRow label={t("profile.email")} value={user?.email ?? "—"} />
        {user?.full_name && <InfoRow label={t("profile.name")} value={user.full_name} />}
        <InfoRow
          label={t("profile.subscription")}
          value={user?.premium_until ? t("profile.premium") : t("profile.free")}
          valueColor={user?.premium_until ? "#C9A96E" : undefined}
        />
        <View className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex-row items-center justify-between">
          <Text className="text-lumis-white/50 font-body text-xs uppercase tracking-widest">
            {t("profile.language")}
          </Text>
          <LanguagePicker />
        </View>
      </Animated.View>

      {/* Objectifs */}
      {user?.goals && user.goals.length > 0 && (
        <Animated.View entering={FadeInDown.delay(220)} className="mb-6">
          <Text className="text-lumis-white/40 font-body text-xs uppercase tracking-widest mb-3">Objectifs</Text>
          <View className="flex-row flex-wrap gap-2">
            {user.goals.map((g) => (
              <View key={g} className="bg-lumis-gold/10 border border-lumis-gold/25 rounded-full px-3 py-1.5">
                <Text className="text-lumis-gold font-body text-xs">{g}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Upgrade CTA si pas premium */}
      {!user?.premium_until && (
        <Animated.View entering={FadeInDown.delay(250)} className="mb-4">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/premium" as any)}
            className="bg-lumis-gold/10 border border-lumis-gold/40 rounded-2xl py-4 px-5 flex-row items-center justify-between"
            activeOpacity={0.85}
          >
            <View>
              <Text className="text-lumis-gold font-body-medium text-sm">Passe à Premium</Text>
              <Text className="text-lumis-white/40 font-body text-xs mt-0.5">Scans illimités · Coach IA · Photos</Text>
            </View>
            <Text className="text-lumis-gold text-lg">👑</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Actions */}
      <Animated.View entering={FadeInDown.delay(260)} className="gap-3">
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-danger/15 border border-danger/30 rounded-xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-danger font-body-medium text-base">{t("profile.logout")}</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center py-3" activeOpacity={0.7}>
          <Text className="text-lumis-white/25 font-body text-sm">{t("profile.delete_account")}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
      <Text className="text-lumis-white/50 font-body text-xs uppercase tracking-widest mb-1">{label}</Text>
      <Text className="font-body-medium text-base" style={{ color: valueColor ?? "#FAFAF8" }}>{value}</Text>
    </View>
  );
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(
    dates.map((d) => {
      const date = new Date(d);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${date.getFullYear()}-${week}`;
    })
  );
  const sorted = Array.from(weeks).sort().reverse();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [y1, w1] = sorted[i - 1].split("-").map(Number);
    const [y2, w2] = sorted[i].split("-").map(Number);
    if (y1 === y2 && w1 - w2 === 1) streak++;
    else if (y1 - y2 === 1 && w2 >= 52 && w1 === 1) streak++;
    else break;
  }
  return streak;
}
