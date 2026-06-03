import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { PasswordInput } from "../../components/ui/PasswordInput";
import {
  PasswordStrengthMeter,
  isPasswordValid,
} from "../../components/ui/PasswordStrengthMeter";
import { t } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";
import { useAuthStore } from "../../stores/auth.store";
import { useThemeColors } from "../../stores/theme.store";

export default function UpgradeScreen() {
  useLanguageStore();
  const c = useThemeColors();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { upgradeAccount } = useAuthStore();

  const handleUpgrade = async () => {
    setError(null);
    if (!isPasswordValid(password)) {
      setError(t("auth.register.password_requirements"));
      return;
    }
    setLoading(true);
    try {
      await upgradeAccount(email.trim().toLowerCase(), password, fullName.trim() || undefined);
      router.back();
    } catch (e: unknown) {
      setError(extractError(e, t("auth.register.error")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(0)} className="flex-row items-center pt-4 pb-2">
            <Text className="text-lumis-white/50 font-body text-sm" onPress={() => router.back()}>
              ← {t("common.back")}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80)} className="mt-6 mb-6">
            <Text className="text-lumis-white font-display text-3xl mb-1">
              {t("auth.upgrade.title")}
            </Text>
            <Text className="text-lumis-white/50 font-body text-base">
              {t("auth.upgrade.subtitle")}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150)} className="gap-4">
            <InputField
              label={t("auth.register.full_name")}
              placeholder={t("auth.register.full_name_placeholder")}
              value={fullName}
              onChangeText={setFullName}
              c={c}
            />
            <InputField
              label={t("auth.register.email")}
              placeholder={t("auth.register.email_placeholder")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              c={c}
            />
            <View>
              <PasswordInput
                label={t("auth.register.password")}
                placeholder={t("auth.register.password_placeholder")}
                value={password}
                onChangeText={setPassword}
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={() => {
                  if (email && password && !loading) handleUpgrade();
                }}
              />
              <PasswordStrengthMeter password={password} />
            </View>

            {error && (
              <Animated.Text
                entering={FadeInDown.duration(200)}
                className="text-danger font-body text-sm text-center"
              >
                {error}
              </Animated.Text>
            )}

            <PrimaryButton
              label={t("auth.upgrade.submit")}
              onPress={handleUpgrade}
              loading={loading}
              disabled={!email || !password}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label, placeholder, value, onChangeText, keyboardType, c,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address";
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View>
      <Text className="text-lumis-white/70 font-body-medium text-sm mb-1.5">{label}</Text>
      <TextInput
        className="bg-card border border-line rounded-xl px-4 py-3.5 text-lumis-white font-body text-base"
        placeholder={placeholder}
        placeholderTextColor={c.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoCorrect={false}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function extractError(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    const err = e as { response?: { data?: { error?: string } } };
    const msg = err.response?.data?.error;
    if (msg === "email already registered") return t("auth.register.email_taken");
    return msg ?? fallback;
  }
  return fallback;
}
