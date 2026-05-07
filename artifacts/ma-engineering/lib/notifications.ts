import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function notifyBotReply(phone: string, preview: string) {
  const granted = await requestNotificationPermission().catch(() => false);
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🤖 Lily ne reply kar di!",
      body: `+${"*".repeat(6)}${phone.slice(-4)}: ${preview.slice(0, 80)}`,
      sound: true,
      badge: 1,
    },
    trigger: null,
  });
}

export async function notifyNewWAMessage(phone: string, msg: string) {
  const granted = await requestNotificationPermission().catch(() => false);
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📱 Naya WhatsApp Message!",
      body: `${phone.slice(-4)}: ${msg.slice(0, 80)}`,
      sound: true,
    },
    trigger: null,
  });
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count).catch(() => {});
}

let lastReplyCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startBotReplyPolling(serverUrl: string) {
  if (pollTimer) clearInterval(pollTimer);
  if (!serverUrl) return;

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${serverUrl}/api/wa/bot-replies`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const replies = data.replies ?? [];
      if (replies.length > lastReplyCount && lastReplyCount > 0) {
        const newest = replies[0];
        await notifyBotReply(newest.phone, newest.botMsg);
        await setBadgeCount(replies.length - lastReplyCount);
      }
      lastReplyCount = replies.length;
    } catch {}
  }, 30000);
}

export function stopBotReplyPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
