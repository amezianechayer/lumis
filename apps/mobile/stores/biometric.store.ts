import { create } from "zustand";
import { MMKV } from "react-native-mmkv";
import * as LocalAuthentication from "expo-local-authentication";
import { t } from "../utils/i18n";

const storage = new MMKV({ id: "lumis-settings" });
const BIOMETRIC_KEY = "biometric_enabled";

const initialEnabled = storage.getBoolean(BIOMETRIC_KEY) ?? false;

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

interface BiometricState {
  /** User has opted into the biometric app lock. */
  enabled: boolean;
  /** App content is currently hidden behind the unlock screen. */
  locked: boolean;
  /** Enable/disable the lock. Returns false if biometrics are unavailable or the
   * confirmation prompt was cancelled. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
  /** Mark the app as locked (called when it goes to the background). */
  lock: () => void;
  /** Prompt the OS biometric check; unlocks on success. */
  unlock: () => Promise<boolean>;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  enabled: initialEnabled,
  // Start locked on a cold launch when the lock is enabled.
  locked: initialEnabled,

  setEnabled: async (enabled) => {
    if (enabled) {
      if (!(await isBiometricAvailable())) return false;
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("biometric.prompt"),
      });
      if (!res.success) return false;
    }
    storage.set(BIOMETRIC_KEY, enabled);
    set({ enabled, locked: false });
    return true;
  },

  lock: () => {
    if (get().enabled) set({ locked: true });
  },

  unlock: async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("biometric.prompt"),
    });
    if (res.success) {
      set({ locked: false });
      return true;
    }
    return false;
  },
}));
