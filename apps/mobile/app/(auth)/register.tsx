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
import { t } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";
import { useAuthStore } from "../../stores/auth.store";

export default function RegisterScreen() {
  useLanguageStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    setError(null);
    if (password.length < 8) {
      setError(t("auth.register.password_too_short"));
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, fullName.trim() || undefined);
      router.replace("/(auth)/onboarding");
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <Animated.View
            entering={FadeInDown.delay(0)}
            className="flex-row items-center justify-between pt-4 pb-2"
          >
            <Text
              className="text-lumis-white/50 font-body text-sm"
              onPress={() => router.back()}
            >
              ← {t("common.back")}
            </Text>
            <LanguagePicker />
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(80)} className="mt-6 mb-6">
            <Text className="text-lumis-white font-display text-3xl mb-1">
              {t("auth.register.title")}
            </Text>
            <Text className="text-lumis-white/50 font-body text-base">
              {t("auth.register.subtitle")}
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(150)} className="gap-4">
            <InputField
              label={t("auth.register.full_name")}
              placeholder={t("auth.register.full_name_placeholder")}
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
            />
            <InputField
              label={t("auth.register.email")}
              placeholder={t("auth.register.email_placeholder")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <InputField
              label={t("auth.register.password")}
              placeholder={t("auth.register.password_placeholder")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
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
              label={t("auth.register.submit")}
              onPress={handleRegister}
              loading={loading}
              disabled={!email || !password}
            />
          </Animated.View>

          {/* Login link */}
          <Animated.View entering={FadeInDown.delay(250)} className="mt-6 items-center">
            <Text
              className="text-lumis-white/50 font-body text-sm"
              onPress={() => router.back()}
            >
              {t("auth.register.already_account")}{" "}
              <Text className="text-lumis-gold font-body-medium">
                {t("auth.register.login")}
              </Text>
            </Text>
          </Animated.View>

          {/* Legal */}
          <Animated.View entering={FadeInDown.delay(300)} className="mt-4 items-center">
            <Text className="text-lumis-white/25 font-body text-xs text-center leading-5">
              En créant un compte, tu acceptes nos{"\n"}
              <Text className="text-lumis-white/40">Conditions d'utilisation</Text>
              {" & "}
              <Text className="text-lumis-white/40">Politique de confidentialité</Text>
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
  autoComplete?: "email" | "password" | "new-password" | "name";
}) {
  return (
    <View>
      <Text className="text-lumis-white/70 font-body-medium text-sm mb-1.5">{label}</Text>
      <TextInput
        className="bg-card border border-line rounded-xl px-4 py-3.5 text-lumis-white font-body text-base"
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
    if (msg === "email already registered") return t("auth.register.email_taken");
    return msg ?? fallback;
  }
  return fallback;
}
