import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Show reminders even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL = "reminders";

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Rappels Lumis",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/**
 * (Re)schedule the local retention reminders: morning + evening routine, a streak
 * nudge, and a weekly skin scan reminder. All on-device — no server / push token.
 */
export async function scheduleReminders(): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const daily = (hour: number, minute: number) => ({
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: ANDROID_CHANNEL,
  });

  await Notifications.scheduleNotificationAsync({
    content: { title: "☀️ Routine du matin", body: "2 minutes pour une belle peau aujourd'hui." },
    trigger: daily(8, 0),
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: "🔥 Garde ta série", body: "N'oublie pas ta routine pour ne pas casser ton streak !" },
    trigger: daily(20, 0),
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: "🌙 Routine du soir", body: "Démaquille et hydrate avant de dormir ✨" },
    trigger: daily(21, 0),
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: "📸 Scan hebdo", body: "Mesure les progrès de ta peau cette semaine." },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 10,
      minute: 0,
      channelId: ANDROID_CHANNEL,
    },
  });
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
