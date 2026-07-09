import { Platform } from "react-native";
import { timeoutSignal } from "@/lib/timeout";

// Safe notification wrapper — never crashes
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Notifications = await import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch { return false; }
}

export async function notifyBotReply(phone: string, preview: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🤖 Lily ne reply kar di!",
        body: `+${"*".repeat(6)}${phone.slice(-4)}: ${preview.slice(0, 80)}`,
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}

export async function notifyNewLead(source: string, name: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎯 Naya Lead — ${source}!`,
        body: `${name} ne inquiry ki hai. Lily auto-reply kar rahi hai!`,
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}

export async function setBadgeCount(count: number): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const Notifications = await import("expo-notifications");
    await Notifications.setBadgeCountAsync(count);
  } catch {}
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastCount = 0;

export function startBotReplyPolling(serverUrl: string): void {
  if (!serverUrl || pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${serverUrl}/api/wa/bot-replies`, { signal: timeoutSignal(5000) });
      const data = await res.json();
      const replies = data.replies ?? [];
      if (replies.length > lastCount && lastCount > 0) {
        const newest = replies[0];
        await notifyBotReply(newest.phone ?? "", newest.botMsg ?? "");
        // Fix(E2): Set the total pending count, not the delta since last poll.
        // replies.length - lastCount showed only the increment, not the real total.
        await setBadgeCount(replies.length);
      }
      lastCount = replies.length;
    } catch {}
  }, 30000);
}

export function stopBotReplyPolling(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

/**
 * Schedules a local push notification for a future date — used for
 * AMC (annual maintenance) reminders and client follow-up reminders.
 * Returns the notification id (or null if scheduling failed/unsupported),
 * so callers can persist it and cancel later if the reminder is rescheduled.
 */
export async function scheduleReminder(
  title: string,
  body: string,
  date: Date
): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    if (date.getTime() <= Date.now()) return null;
    const Notifications = await import("expo-notifications");
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: "date", date } as any,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    if (Platform.OS === "web" || !id) return;
    const Notifications = await import("expo-notifications");
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
