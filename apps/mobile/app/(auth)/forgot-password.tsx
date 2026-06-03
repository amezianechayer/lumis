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
import { LumisLogo } from "../../components/ui/LumisLogo";
import { api } from "../../services/api";
import { t } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";
import { useThemeColors } from "../../stores/theme.store";

export default function ForgotPasswordScreen() {
  useLanguageStore();
  const c = useThemeColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
    } catch {
      // Endpoint always succeeds server-side to avoid leaking account existence.
    } finally {
      setLoading(false);
      setSent(true);
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
          <Animated.View
            entering={FadeInDown.delay(0)}
            className="flex-row items-center pt-4 pb-2"
          >
            <Text
              className="text-lumis-white/50 font-body text-sm"
              onPress={() => router.back()}
            >
              ← {t("common.back")}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(50)} className="items-center py-8">
            <LumisLogo size={72} />
          </Animated.View>

          {!sent ? (
            <>
              <Animated.View entering={FadeInDown.delay(100)} className="mb-6">
                <Text className="text-lumis-white font-display text-2xl mb-1">
                  {t("auth.forgot.title")}
                </Text>
                <Text className="text-lumis-white/50 font-body text-base">
                  {t("auth.forgot.subtitle")}
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150)} className="gap-4">
                <View>
                  <Text className="text-lumis-white/70 font-body-medium text-sm mb-1.5">
                    {t("auth.forgot.email")}
                  </Text>
                  <TextInput
                    className="bg-card border border-line rounded-xl px-4 py-3.5 text-lumis-white font-body text-base"
                    placeholder={t("auth.forgot.email_placeholder")}
                    placeholderTextColor={c.textFaint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    returnKeyType="go"
                    onSubmitEditing={() => {
                      if (email && !loading) handleSubmit();
                    }}
                  />
                </View>

                <PrimaryButton
                  label={t("auth.forgot.submit")}
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!email}
                />
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.duration(250)} className="gap-4">
              <Text className="text-lumis-white font-display text-2xl text-center">
                {t("auth.forgot.sent_title")}
              </Text>
              <Text className="text-lumis-white/60 font-body text-base text-center leading-6">
                {t("auth.forgot.sent_message")}
              </Text>
              <View className="mt-4">
                <PrimaryButton
                  label={t("auth.forgot.back_to_login")}
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
