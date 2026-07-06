/**
 * TITAN CRASH ALERT — WhatsApp + Telegram (unified dispatcher)
 *
 * sendWACrashAlert() dispatches BOTH channels independently via
 * Promise.allSettled — neither channel gates the other.
 * Works correctly in all four states:
 *   (a) WA only configured   → WA fires, Telegram skipped
 *   (b) Telegram only        → Telegram fires, WA skipped
 *   (c) Both configured      → both fire in parallel
 *   (d) Neither configured   → silent no-op
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { sendTelegramAlert } from "@/lib/telegramAlert";
import { timeoutSignal } from "@/lib/timeout";

const ADMIN_PHONE = "917895643069"; // Suhan Siddiqui
const WA_API_BASE  = "https://graph.facebook.com/v18.0";
const FETCH_TIMEOUT_MS = 8_000;

function getISTTime(): string {
  try {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toISOString();
  }
}

function getDeviceLabel(): string {
  try {
    const c = Platform.constants as any;
    const brand = c?.Brand ?? c?.Manufacturer ?? "";
    const model = c?.Model ?? "";
    return `${brand} ${model} (${Platform.OS} ${Platform.Version})`.trim();
  } catch {
    return `${Platform.OS} ${Platform.Version}`;
  }
}

/** Internal: send via WhatsApp only. Skips silently if tokens not set. */
async function sendViaWhatsApp(
  title: string,
  details: string,
  context?: string,
): Promise<void> {
  const [waToken, wabaId] = await Promise.all([
    AsyncStorage.getItem("wa_token"),
    AsyncStorage.getItem("waba_id"),
  ]);

  if (!waToken || !wabaId) {
    console.warn("[WACrashAlert] WA tokens not set — WA channel skipped");
    return;
  }

  const device = getDeviceLabel();
  const ts     = getISTTime();

  const body =
    `🚨 *MA TITAN ERROR ALERT*\n\n` +
    `⚠️ *${title}*\n\n` +
    `📋 *Details:*\n${details.slice(0, 600)}` +
    (context ? `\n\n📍 *Context:* \`${context}\`` : "") +
    `\n\n📱 *Device:* ${device}` +
    `\n🕐 *Time (IST):* ${ts}` +
    `\n\n_— Auto-reported by MA TITAN v3.2_`;

  const resp = await fetch(`${WA_API_BASE}/${wabaId}/messages`, {
    method: "POST",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${waToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: ADMIN_PHONE,
      type: "text",
      text: { body, preview_url: false },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.warn("[WACrashAlert] WA API error:", resp.status, err.slice(0, 100));
  }
}

/**
 * Send a crash alert to ALL configured channels (WA + Telegram) in parallel.
 * Each channel is independent — one failing does not block the other.
 */
export async function sendWACrashAlert(
  title: string,
  details: string,
  context?: string,
): Promise<void> {
  await Promise.allSettled([
    sendViaWhatsApp(title, details, context).catch((err) =>
      console.warn("[WACrashAlert] WA channel error:", err),
    ),
    sendTelegramAlert(title, details, context),
  ]);
}

/**
 * Convenience: "splash screen stuck" alert with timing info.
 */
export async function sendSplashStuckAlert(stuckMs: number): Promise<void> {
  await sendWACrashAlert(
    "App Splash Screen Pe Atak Gaya",
    `App ${(stuckMs / 1000).toFixed(1)} seconds se splash screen pe atki hui hai aur tabs nahi khule.\n\n` +
      `Possible causes:\n` +
      `• Firebase init hang\n` +
      `• Reanimated crash\n` +
      `• Navigation error (router.replace failed)\n` +
      `• Font loading timeout`,
    "SplashScreen/timeout",
  );
}
