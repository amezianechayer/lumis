import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../../components/onboarding/OnboardingLayout";
import { OptionCard } from "../../../components/ui/OptionCard";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { t } from "../../../utils/i18n";
import { useLanguageStore } from "../../../stores/language.store";
import { MMKV } from "react-native-mmkv";
import { api } from "../../../services/api";

const storage = new MMKV({ id: "lumis-profile" });

const SKIN_TYPES: { key: string; icon: string; labelKey: string; descKey: string }[] = [
  { key: "normal", icon: "😊", labelKey: "onboarding.skin_type.normal", descKey: "onboarding.skin_type.normal_desc" },
  { key: "oily", icon: "💦", labelKey: "onboarding.skin_type.oily", descKey: "onboarding.skin_type.oily_desc" },
  { key: "dry", icon: "🌵", labelKey: "onboarding.skin_type.dry", descKey: "onboarding.skin_type.dry_desc" },
  { key: "combination", icon: "☯️", labelKey: "onboarding.skin_type.combination", descKey: "onboarding.skin_type.combination_desc" },
  { key: "sensitive", icon: "🌸", labelKey: "onboarding.skin_type.sensitive", descKey: "onboarding.skin_type.sensitive_desc" },
];

export default function SkinTypeScreen() {
  useLanguageStore();
  const [selected, setSelected] = useState<string | null>(null);

  const handleFinish = async () => {
    if (!selected) return;
    storage.set("skin_type", selected);
    storage.set("onboarding_completed", true);
    // Persist skin_type to backend so it's used in score calculations
    api.updateMe({ skin_type: selected }).catch(() => {});
    // Fire-and-forget: generate recommendations in the background
    api.generateRecommendations().catch(() => {});
    router.replace("/(tabs)");
  };

  return (
    <OnboardingLayout step={5}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="mb-6 mt-2">
          <Text className="text-lumis-white font-display text-3xl mb-2">
            {t("onboarding.skin_type.title")}
          </Text>
          <Text className="text-lumis-white/60 font-body text-base leading-6">
            {t("onboarding.skin_type.subtitle")}
          </Text>
        </Animated.View>

        <View className="gap-3">
          {SKIN_TYPES.map((s, i) => (
            <Animated.View key={s.key} entering={FadeInDown.delay(80 + i * 60).duration(400)}>
              <OptionCard
                icon={s.icon}
                label={t(s.labelKey)}
                description={t(s.descKey)}
                selected={selected === s.key}
                onPress={() => setSelected(s.key)}
              />
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          className="pt-6 pb-4"
        >
          <PrimaryButton
            label={t("onboarding.skin_type.finish")}
            onPress={handleFinish}
            disabled={!selected}
          />
        </Animated.View>
      </ScrollView>
    </OnboardingLayout>
  );
}
