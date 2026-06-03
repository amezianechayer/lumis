import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { LumisLogo } from "../../components/ui/LumisLogo";
import { api } from "../../services/api";
import { t } from "../../utils/i18n";
import { useLanguageStore } from "../../stores/language.store";
import { useAuthStore } from "../../stores/auth.store";
import { useThemeColors } from "../../stores/theme.store";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailScreen() {
  useLanguageStore();
  const c = useThemeColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, updateUser } = useAuthStore();
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        if (active) setStatus("error");
        return;
      }
      try {
        await api.verifyEmail(token);
        if (!active) return;
        updateUser({ email_verified: true });
        setStatus("success");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const goHome = () => {
    router.replace(isAuthenticated ? "/(tabs)" : "/(auth)/login");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-lumis-black items-center justify-center px-6"
      style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}
    >
      <Animated.View entering={FadeInDown} className="items-center gap-5 w-full">
        <LumisLogo size={80} />

        {status === "verifying" && (
          <>
            <ActivityIndicator color={c.primary} size="large" />
            <Text className="text-lumis-white/60 font-body text-base">
              {t("auth.verify.verifying")}
            </Text>
          </>
        )}

        {status === "success" && (
          <>
            <Text className="text-3xl">✅</Text>
            <Text className="text-lumis-white font-display text-2xl text-center">
              {t("auth.verify.success")}
            </Text>
            <View className="w-full mt-2">
              <PrimaryButton label={t("auth.verify.go_to_app")} onPress={goHome} />
            </View>
          </>
        )}

        {status === "error" && (
          <>
            <Text className="text-3xl">⚠️</Text>
            <Text className="text-lumis-white font-display text-xl text-center">
              {t("auth.verify.error")}
            </Text>
            <View className="w-full mt-2">
              <PrimaryButton label={t("auth.verify.go_to_app")} onPress={goHome} variant="outline" />
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
