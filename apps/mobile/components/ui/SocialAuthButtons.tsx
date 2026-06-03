import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuthStore } from "../../stores/auth.store";
import { t } from "../../utils/i18n";

// Native Google Sign-In (no browser redirect → avoids the expo-auth-session
// "invalid_request" issue on Android). idToken aud = webClientId, accepted by the
// backend's GOOGLE_CLIENT_IDS.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export function SocialAuthButtons() {
  const { googleLogin } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      // v13+ returns { type, data: { idToken } }; older returns { idToken }.
      const idToken = (res as any)?.data?.idToken ?? (res as any)?.idToken;
      if (!idToken) return;
      await googleLogin(idToken);
      router.replace("/");
    } catch {
      // User cancelled or sign-in failed — stay on the auth screen.
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-3 mt-2">
      <View className="flex-row items-center my-1">
        <View className="flex-1 h-px bg-line" />
        <Text className="text-lumis-white/30 font-body text-xs mx-3">{t("auth.social.or")}</Text>
        <View className="flex-1 h-px bg-line" />
      </View>

      <Pressable
        onPress={handleGoogle}
        disabled={loading}
        className="flex-row items-center justify-center bg-card border border-line rounded-xl py-3.5 gap-2"
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
