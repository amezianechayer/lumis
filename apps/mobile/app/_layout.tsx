import "../global.css";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "../stores/auth.store";
import { useBiometricStore } from "../stores/biometric.store";
import { BiometricLockOverlay } from "../components/ui/BiometricLockOverlay";
import { initRevenueCat } from "../services/revenuecat";
// Initialize language store on boot (restores persisted locale)
import "../stores/language.store";
import { useThemeStore } from "../stores/theme.store";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const { checkAuth } = useAuthStore();
  const { mode, colors } = useThemeStore();

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    // Hide splash when fonts are ready OR if fonts fail — never block forever
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync().catch(() => {});
    initRevenueCat().catch(() => {});
    checkAuth().catch(() => {});
  }, [fontsLoaded, fontError]);

  // Safety timeout — force hide splash after 4s no matter what
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  // Engage the biometric lock whenever the app leaves the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      // Only lock when the app truly goes to the background — NOT on the transient
      // "inactive" state (notification shade, control center, the biometric prompt
      // itself), which otherwise caused repeated unlock prompts.
      if (state === "background") {
        useBiometricStore.getState().lock();
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} backgroundColor={colors.bg} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <BiometricLockOverlay />
      </View>
    </QueryClientProvider>
  );
}
