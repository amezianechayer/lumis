import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../../components/onboarding/OnboardingLayout";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { t } from "../../../utils/i18n";
import { useLanguageStore } from "../../../stores/language.store";
import { api } from "../../../services/api";
import { useAuthStore } from "../../../stores/auth.store";
import { useThemeColors } from "../../../stores/theme.store";

const TERRACOTTA = "#C9826B";
const MIN_AGE = 13;
const MAX_AGE = 99;

export default function AgeScreen() {
  useLanguageStore();
  const c = useThemeColors();
  const { updateUser } = useAuthStore();
  const [age, setAge] = useState<number>(25);
  const [loading, setLoading] = useState(false);

  const clamp = (v: number) => Math.max(MIN_AGE, Math.min(MAX_AGE, v));

  const handleNext = async () => {
    setLoading(true);
    // Store as approximate date of birth (Jan 1 of birth year)
    const birthYear = new Date().getFullYear() - age;
    const dob = new Date(birthYear, 0, 1).toISOString();
    try {
      await api.updateMe({ date_of_birth: dob });
      updateUser({ date_of_birth: dob });
    } catch {
      // Non-blocking — proceed anyway
    } finally {
      setLoading(false);
    }
    router.push("/(auth)/onboarding/goals");
  };

  return (
    <OnboardingLayout step={2}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} className="mb-2 mt-4">
          <Text className="text-lumis-white font-display text-3xl mb-2">Quel âge as-tu ?</Text>
          <Text className="text-lumis-white/60 font-body text-base leading-6">
            L'âge est essentiel : il adapte ton analyse de peau, tes recommandations et ton coach (prévention, premiers signes, anti-âge…).
          </Text>
        </Animated.View>

        {/* Big age stepper */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
            <TouchableOpacity
              onPress={() => setAge((a) => clamp(a - 1))}
              activeOpacity={0.7}
              style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: TERRACOTTA, fontSize: 28, fontWeight: "300" }}>−</Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center", minWidth: 120 }}>
              <TextInput
                value={String(age)}
                onChangeText={(txt) => {
                  const n = parseInt(txt.replace(/[^0-9]/g, ""), 10);
                  if (!isNaN(n)) setAge(Math.min(MAX_AGE, n));
                  else setAge(MIN_AGE);
                }}
                onEndEditing={() => setAge((a) => clamp(a))}
                keyboardType="number-pad"
                maxLength={2}
                style={{ color: c.text, fontSize: 72, fontWeight: "800", textAlign: "center", padding: 0 }}
              />
              <Text style={{ color: c.textMuted, fontSize: 14, marginTop: -4 }}>ans</Text>
            </View>

            <TouchableOpacity
              onPress={() => setAge((a) => clamp(a + 1))}
              activeOpacity={0.7}
              style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: TERRACOTTA, fontSize: 28, fontWeight: "300" }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Quick chips */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
            {[18, 25, 30, 40, 50].map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => setAge(preset)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5,
                  backgroundColor: age === preset ? TERRACOTTA : c.bgCard,
                  borderColor: age === preset ? TERRACOTTA : c.border,
                }}
              >
                <Text style={{ color: age === preset ? "#fff" : c.textMuted, fontWeight: "600", fontSize: 13 }}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} className="pt-2 pb-6">
          <PrimaryButton label={t("common.continue")} onPress={handleNext} loading={loading} />
        </Animated.View>
      </View>
    </OnboardingLayout>
  );
}
