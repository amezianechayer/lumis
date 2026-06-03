import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { PasswordInput } from "../../components/ui/PasswordInput";
import {
  PasswordStrengthMeter,
  isPasswordValid,
} from "../../components/ui/PasswordStrengthMeter";
import { LumisLogo } from "../../components/ui/LumisLogo";
import { api } from "../../services/api";
import { t } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";

export default function ResetPasswordScreen() {
  useLanguageStore();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!token) {
      setError(t("auth.reset.missing_token"));
      return;
    }
    if (!isPasswordValid(password)) {
      setError(t("auth.register.password_requirements"));
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (e: unknown) {
      setError(extractError(e, t("auth.reset.invalid_link")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(50)} className="items-center py-10">
            <LumisLogo size={72} />
          </Animated.View>

          {!done ? (
            <>
              <Animated.View entering={FadeInDown.delay(100)} className="mb-6">
                <Text className="text-lumis-white font-display text-2xl mb-1">
                  {t("auth.reset.title")}
                </Text>
                <Text className="text-lumis-white/50 font-body text-base">
                  {t("auth.reset.subtitle")}
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150)} className="gap-4">
                <View>
                  <PasswordInput
                    label={t("auth.reset.password")}
                    placeholder={t("auth.reset.password_placeholder")}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="new-password"
                    returnKeyType="go"
                    onSubmitEditing={() => {
                      if (password && !loading) handleSubmit();
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
                  label={t("auth.reset.submit")}
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!password}
                />
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.duration(250)} className="gap-4">
              <Text className="text-lumis-white font-display text-2xl text-center">
                {t("auth.reset.success")}
              </Text>
              <View className="mt-4">
                <PrimaryButton
                  label={t("auth.login.submit")}
                  onPress={() => router.replace("/(auth)/login")}
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function extractError(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    const err = e as { response?: { data?: { error?: string } } };
    return err.response?.data?.error ?? fallback;
  }
  return fallback;
}
