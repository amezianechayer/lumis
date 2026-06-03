import { create } from "zustand";
import { MMKV } from "react-native-mmkv";
import { ensureNotificationPermission, scheduleReminders, cancelReminders } from "../services/notifications";

const storage = new MMKV({ id: "lumis-settings" });
const KEY = "notifications_enabled";

const initialEnabled = storage.getBoolean(KEY) ?? false;

interface NotificationState {
  enabled: boolean;
  /** Toggle reminders. Returns false if notification permission was refused. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  enabled: initialEnabled,
  setEnabled: async (enabled) => {
    if (enabled) {
      const ok = await ensureNotificationPermission();
      if (!ok) return false;
      await scheduleReminders();
    } else {
      await cancelReminders();
    }
    storage.set(KEY, enabled);
    set({ enabled });
    return true;
  },
}));
