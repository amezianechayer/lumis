import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useBiometricStore } from "../../stores/biometric.store";
import { useAuthStore } from "../../stores/auth.store";
import { LumisLogo } from "./LumisLogo";
import { t } from "../../utils/i18n";

/**
 * Full-screen gate shown when the biometric app lock is engaged. Rendered above
 * the navigator so app content is never visible until the user authenticates.
 */
export function BiometricLockOverlay() {
  const { locked, unlock } = useBiometricStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const active = locked && isAuthenticated;

  useEffect(() => {
    if (active) {
      // Auto-prompt as soon as the lock engages.
      unlock().catch(() => {});
    }
  }, [active]);

  if (!active) return null;

  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
      className="bg-lumis-black items-center justify-center px-8"
    >
      <LumisLogo size={88} />
      <Text className="text-lumis-white font-display text-2xl mt-6 mb-2 text-center">
        {t("biometric.lock_title")}
      </Text>
      <Text className="text-lumis-white/50 font-body text-sm text-center mb-8">
        {t("biometric.lock_subtitle")}
      </Text>
      <Pressable
        onPress={() => unlock().catch(() => {})}
        className="bg-lumis-gold rounded-xl px-8 py-3.5"
      >
        <Text className="text-lumis-black font-body-bold text-base">{t("biometric.unlock")}</Text>
      </Pressable>
    </View>
  );
}
