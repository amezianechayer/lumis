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
import { LanguagePicker } from "../../components/ui/LanguagePicker";
import { LumisLogo } from "../../components/ui/LumisLogo";
import { t } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";
import { useAuthStore } from "../../stores/auth.store";

export default function LoginScreen() {
  useLanguageStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(extractError(e, t("auth.login.error")));
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
          {/* Language picker */}
          <Animated.View entering={FadeInDown.delay(0)} className="items-end pt-4 pb-2">
            <LanguagePicker />
          </Animated.View>

          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(50)} className="items-center py-8">
            <LumisLogo size={90} showWordmark />
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(100)} className="mb-6">
            <Text className="text-lumis-white font-display text-2xl">
              {t("auth.login.title")}
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(150)} className="gap-4">
            <InputField
              label={t("auth.login.email")}
              placeholder={t("auth.login.email_placeholder")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <InputField
              label={t("auth.login.password")}
              placeholder={t("auth.login.password_placeholder")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            {error && (
              <Animated.Text
                entering={FadeInDown.duration(200)}
                className="text-danger font-body text-sm text-center"
              >
                {error}
              </Animated.Text>
            )}

            <PrimaryButton
              label={t("auth.login.submit")}
              onPress={handleLogin}
              loading={loading}
              disabled={!email || !password}
            />
          </Animated.View>

          {/* Register link */}
          <Animated.View entering={FadeInDown.delay(250)} className="mt-6 items-center">
            <Text
              className="text-lumis-white/50 font-body text-sm"
              onPress={() => router.push("/(auth)/register")}
            >
              {t("auth.login.no_account")}{" "}
              <Text className="text-lumis-gold font-body-medium">
                {t("auth.login.create_account")}
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  autoComplete?: "email" | "password" | "name";
}) {
  return (
    <View>
      <Text className="text-lumis-white/70 font-body-medium text-sm mb-1.5">{label}</Text>
      <TextInput
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-lumis-white font-body text-base"
        placeholder={placeholder}
        placeholderTextColor="#ffffff30"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
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
    if (msg === "invalid email or password") return t("auth.login.invalid_credentials");
    return msg ?? fallback;
  }
  return fallback;
}
