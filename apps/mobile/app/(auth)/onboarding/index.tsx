import { View, Text, SafeAreaView, Platform, StatusBar } from "react-native";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { LumisLogo } from "../../../components/ui/LumisLogo";
import { t } from "../../../utils/i18n";
import { useLanguageStore } from "../../../stores/language.store";

const FEATURES = [
  {
    icon: "🔬",
    titleKey: "onboarding.welcome.feature_1_title",
    descKey: "onboarding.welcome.feature_1_desc",
  },
  {
    icon: "📊",
    titleKey: "onboarding.welcome.feature_2_title",
    descKey: "onboarding.welcome.feature_2_desc",
  },
  {
    icon: "✨",
    titleKey: "onboarding.welcome.feature_3_title",
    descKey: "onboarding.welcome.feature_3_desc",
  },
];

export default function OnboardingWelcome() {
  // Subscribe so component re-renders on locale change
  useLanguageStore();

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <View className="flex-1 px-6 pt-8 pb-10 justify-between">
        {/* Logo + title */}
        <Animated.View entering={FadeInDown.delay(0).duration(600)} className="items-center">
          <LumisLogo size={96} showWordmark />
          <Text className="text-lumis-white/60 font-body text-base text-center leading-6 mt-4">
            {t("onboarding.welcome.subtitle")}
          </Text>
        </Animated.View>

        {/* Features */}
        <View className="gap-4">
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.titleKey}
              entering={FadeInDown.delay(200 + i * 100).duration(500)}
              className="flex-row items-start gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-lumis-gold/15 items-center justify-center">
                <Text className="text-xl">{f.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lumis-white font-body-bold text-sm mb-0.5">
                  {t(f.titleKey)}
                </Text>
                <Text className="text-lumis-white/50 font-body text-xs leading-5">
                  {t(f.descKey)}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <PrimaryButton
            label={t("onboarding.welcome.cta")}
            onPress={() => router.push("/(auth)/onboarding/gender")}
          />
          <Text className="text-lumis-white/30 font-body text-xs text-center mt-3">
            Gratuit · Sans carte bancaire
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
