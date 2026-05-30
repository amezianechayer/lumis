import { Redirect } from "expo-router";
import { useAuthStore } from "../stores/auth.store";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-lumis-black">
        <ActivityIndicator color="#C9A96E" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Goals are saved during onboarding — if empty, user hasn't completed it
  const onboardingDone = (user?.goals?.length ?? 0) > 0;
  return onboardingDone ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/(auth)/onboarding" />
  );
}
