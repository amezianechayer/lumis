import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../../stores/auth.store";
import { t } from "../../utils/i18n";

WebBrowser.maybeCompleteAuthSession();

/**
 * Google sign-in button. Requires the native modules (dev-client rebuild) and
 * OAuth client IDs in EXPO_PUBLIC_GOOGLE_* env vars.
 * (Apple Sign In intentionally omitted for now — see project notes.)
 */
export function SocialAuthButtons() {
  const { googleLogin } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params?.id_token ?? response.authentication?.idToken;
    if (!idToken) return;
    setLoading(true);
    googleLogin(idToken)
      .then(() => router.replace("/"))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [response]);

  return (
    <View className="gap-3 mt-2">
      <View className="flex-row items-center my-1">
        <View className="flex-1 h-px bg-line" />
        <Text className="text-lumis-white/30 font-body text-xs mx-3">{t("auth.social.or")}</Text>
        <View className="flex-1 h-px bg-line" />
      </View>

      <Pressable
        onPress={() => promptAsync()}
        disabled={!request || loading}
        className="flex-row items-center justify-center bg-card border border-line rounded-xl py-3.5 gap-2"
        style={{ opacity: !request ? 0.5 : 1 }}
      >
        {loading ? (
          <ActivityIndicator color="#C9826B" />
        ) : (
          <>
            <Text className="text-lumis-white font-body-bold text-base">G</Text>
            <Text className="text-lumis-white font-body-bold text-base">
              {t("auth.social.google")}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
