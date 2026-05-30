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

type GenderKey = "male" | "female" | "nonbinary" | "prefer_not";

const GENDERS: { key: GenderKey; emoji: string; labelKey: string }[] = [
  { key: "male", emoji: "♂️", labelKey: "onboarding.gender.male" },
  { key: "female", emoji: "♀️", labelKey: "onboarding.gender.female" },
  { key: "nonbinary", emoji: "⚧️", labelKey: "onboarding.gender.nonbinary" },
  { key: "prefer_not", emoji: "·", labelKey: "onboarding.gender.prefer_not" },
];

export default function GenderScreen() {
  useLanguageStore(); // re-render on locale change
  const [selected, setSelected] = useState<GenderKey | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuthStore();

  const handleNext = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.updateMe({ gender: selected });
      updateUser({ gender: selected });
    } catch {
      // Non-blocking — proceed anyway
    } finally {
      setLoading(false);
    }
    router.push("/(auth)/onboarding/goals");
  };

  return (
    <OnboardingLayout step={1} showBack={false}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="mb-8 mt-4">
          <Text className="text-lumis-white font-display text-3xl mb-2">
            {t("onboarding.gender.title")}
          </Text>
          <Text className="text-lumis-white/60 font-body text-base leading-6">
            {t("onboarding.gender.subtitle")}
          </Text>
        </Animated.View>

        {/* Options */}
        <View className="gap-3">
          {GENDERS.map((g, i) => (
            <Animated.View key={g.key} entering={FadeInDown.delay(100 + i * 70).duration(400)}>
              <OptionCard
                icon={g.emoji}
                label={t(g.labelKey)}
                selected={selected === g.key}
                onPress={() => setSelected(g.key)}
              />
            </Animated.View>
          ))}
        </View>

        <View className="flex-1 min-h-[32px]" />

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} className="pt-2 pb-4">
          <PrimaryButton
            label={t("common.continue")}
            onPress={handleNext}
            disabled={!selected}
            loading={loading}
          />
        </Animated.View>
      </ScrollView>
    </OnboardingLayout>
  );
}
