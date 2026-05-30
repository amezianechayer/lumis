import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../../components/onboarding/OnboardingLayout";
import { OptionCard } from "../../../components/ui/OptionCard";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { t } from "../../../utils/i18n";
import { useLanguageStore } from "../../../stores/language.store";
import { api } from "../../../services/api";
import { useAuthStore } from "../../../stores/auth.store";

const GOALS: { key: string; icon: string; labelKey: string }[] = [
  { key: "clear_skin", icon: "✨", labelKey: "onboarding.goals.clear_skin" },
  { key: "anti_aging", icon: "⏳", labelKey: "onboarding.goals.anti_aging" },
  { key: "hydration", icon: "💧", labelKey: "onboarding.goals.hydration" },
  { key: "makeup", icon: "💄", labelKey: "onboarding.goals.makeup" },
  { key: "grooming", icon: "🧔", labelKey: "onboarding.goals.grooming" },
  { key: "haircut", icon: "✂️", labelKey: "onboarding.goals.haircut" },
  { key: "color_season", icon: "🎨", labelKey: "onboarding.goals.color_season" },
  { key: "product_scan", icon: "🔬", labelKey: "onboarding.goals.product_scan" },
];

export default function GoalsScreen() {
  useLanguageStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuthStore();

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleNext = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await api.updateMe({ goals: selected });
      updateUser({ goals: selected });
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
    router.push("/(auth)/onboarding/selfie");
  };

  const ctaLabel =
    selected.length > 0
      ? `${t("common.continue")} (${selected.length})`
      : t("common.continue");

  return (
    <OnboardingLayout step={2}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="mb-6 mt-4">
          <Text className="text-lumis-white font-display text-3xl mb-2">
            {t("onboarding.goals.title")}
          </Text>
          <Text className="text-lumis-white/60 font-body text-base leading-6">
            {t("onboarding.goals.subtitle")}
          </Text>
        </Animated.View>

        {/* Options grid */}
        <View className="gap-3">
          {GOALS.map((g, i) => (
            <Animated.View key={g.key} entering={FadeInDown.delay(80 + i * 50).duration(400)}>
              <OptionCard
                icon={g.icon}
                label={t(g.labelKey)}
                selected={selected.includes(g.key)}
                onPress={() => toggle(g.key)}
              />
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.delay(550).duration(400)}
          className="pt-6 pb-4"
        >
          <PrimaryButton
            label={ctaLabel}
            onPress={handleNext}
            disabled={selected.length === 0}
            loading={loading}
          />
        </Animated.View>
      </ScrollView>
    </OnboardingLayout>
  );
}
